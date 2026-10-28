/** @jest-environment node */
import { eq } from 'drizzle-orm';

import { forms, pins, syncQueue } from '~/db/schema';
import { deletePin } from '~/features/pins/services/PinService';
import { fetchForm } from '~/services/api/formsApi';
import { fetchPin } from '~/services/api/pinsApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';

import { uploadPendingChanges } from '../queue/syncQueue';
import { finishSetup } from '../transferCoordinator';

import { createCurrentServer, createForm, createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({ deleteImagesByFilename: jest.fn() }));
jest.mock('~/services/api/syncApi', () => ({ sync: jest.fn() }));
jest.mock('~/services/api/pinsApi', () => ({ fetchPin: jest.fn() }));
jest.mock('~/services/api/formsApi', () => ({ fetchForm: jest.fn() }));
const api = jest.mocked(sync);
const server = createCurrentServer();
beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  jest.useFakeTimers();
  api.mockReset();
  server.clear();
  jest.mocked(fetchPin).mockImplementation(server.fetchPin);
  jest.mocked(fetchForm).mockImplementation(server.fetchForm);
  api.mockImplementation(server.sync);
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('saving never uploads automatically after two seconds or a minute', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  await jest.advanceTimersByTimeAsync(60000);
  expect(api).not.toHaveBeenCalled();
});

test('one explicit session uploads more than ten changes and reports actual results', async () => {
  for (let i = 0; i < 25; i++) await createPin({ id: `p${i}`, name: `A${i}`, lat: 1, lng: 2 });
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ uploaded: 25, failed: 0, blocked: 0, remaining: 0 });
  expect(
    db
      .select()
      .from(syncQueue)
      .all()
      .every((row) => row.status === 'completed')
  ).toBe(true);
});

test('a timed-out operation retries with the same idempotency key on the next manual session', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  api.mockRejectedValueOnce(new Error('timeout'));
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, uploaded: 0, remaining: 1 });
  await jest.advanceTimersByTimeAsync(60000);
  expect(api).toHaveBeenCalledTimes(1);
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, remaining: 0 });
  expect(api.mock.calls[0][0].idempotencyKey).toBe(api.mock.calls[1][0].idempotencyKey);
});

test('a committed write with a lost acknowledgement is applied only once across manual retries', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  let serverWrites = 0;
  api.mockImplementation(async (request) => {
    server.commit(request);
    serverWrites++;
    throw new Error('Response lost after commit');
  });
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, remaining: 0 });
  expect(serverWrites).toBe(1);
  expect(api).toHaveBeenCalledTimes(1);
  expect(db.select().from(pins).get()?.version).toBe(1);
});

test('parent failures block dependent forms without sending them', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  await createForm({ pinId: 'p', name: 'Patient', villageId: '', village: 'Krang Svat' });
  api.mockResolvedValue({ success: false, error: 'Unavailable' });
  expect(await uploadPendingChanges()).toMatchObject({
    uploaded: 0,
    failed: 1,
    blocked: 1,
    remaining: 2,
  });
  expect(api).toHaveBeenCalledTimes(1);
});

test('a version conflict leaves local responses intact and reports failure', async () => {
  await createPin({ id: 'p', name: 'Local response', lat: 1, lng: 2 });
  api.mockResolvedValue({ success: false, error: 'Conflict: newer data exists' });
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, uploaded: 0 });
  expect(db.select().from(pins).get()?.name).toBe('Local response');
  expect(db.select().from(syncQueue).get()?.status).toBe('failed');
});

test('parent pins are sent before forms regardless of queue timestamps', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  const form = await createForm({
    pinId: 'p',
    name: 'Patient',
    villageId: '',
    village: 'Krang Svat',
  });
  db.update(syncQueue).set({ sequenceNumber: 0 }).where(eq(syncQueue.entityType, 'form')).run();
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 2 });
  expect(api.mock.calls.map((call) => call[0].entityType)).toEqual(['pin', 'form']);
  expect(db.select().from(forms).where(eq(forms.id, form.id)).get()?.status).toBe('synced');
});

test('deleting a pin after an ambiguous timeout queues a delete instead of cancelling it', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  api.mockRejectedValueOnce(new Error('timeout after server may have committed'));
  await uploadPendingChanges();
  await deletePin('p');
  expect(db.select().from(syncQueue).all()).toEqual([
    expect.objectContaining({ operation: 'delete', status: 'pending' }),
  ]);
});
