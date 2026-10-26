/** @jest-environment node */
import { FORM_ARRAY_FIELDS } from '~/db/formArrayFields';
import { forms, pins, syncQueue } from '~/db/schema';
import { fetchForms } from '~/services/api/formsApi';
import { fetchPins } from '~/services/api/pinsApi';
import { db } from '~/services/drizzleDb';

import { clearLocalData, downloadLatest } from '../localDataTransfer';
import { finishSetup } from '../transferCoordinator';

import { createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({
  deleteImageByFilename: jest.fn(),
  deleteImagesByFilename: jest.fn(),
}));
jest.mock('~/services/api/pinsApi', () => ({ fetchPins: jest.fn() }));
jest.mock('~/services/api/formsApi', () => ({ fetchForms: jest.fn() }));
const serverPin = {
  id: 'remote',
  name: 'Remote',
  lat: 1,
  lng: 2,
  images: [],
  createdAt: new Date(),
  version: 1,
};
beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  jest.mocked(fetchPins).mockResolvedValue({ success: true, data: [serverPin] } as never);
  jest.mocked(fetchForms).mockResolvedValue({ success: true, data: [] });
});

test('download refuses any local pins even when they are uploaded', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  db.update(pins).set({ status: 'synced' }).run();
  db.update(syncQueue).set({ status: 'completed' }).run();
  await expect(downloadLatest()).rejects.toThrow(/empty|clear/i);
  expect(db.select().from(pins).get()?.id).toBe('p');
});

test('the mobile answer-field list matches the shared contract without runtime coupling', () => {
  expect(FORM_ARRAY_FIELDS).toEqual(require('@assetmapping/shared-types').FORM_ARRAY_FIELDS);
});

test('outstanding delete operation blocks download with empty tables', async () => {
  db.insert(syncQueue)
    .values({
      id: 'q',
      entityId: 'p',
      entityType: 'pin',
      operation: 'delete',
      payload: '{}',
      idempotencyKey: 'k',
      status: 'pending',
    })
    .run();
  await expect(downloadLatest()).rejects.toThrow();
});

test('completed queue history does not block an atomic download', async () => {
  db.insert(syncQueue)
    .values({
      id: 'q',
      entityId: 'p',
      entityType: 'pin',
      operation: 'delete',
      payload: '{}',
      idempotencyKey: 'k',
      status: 'completed',
    })
    .run();
  expect(await downloadLatest()).toEqual({ pins: 1, forms: 0 });
  expect(db.select().from(pins).get()?.status).toBe('synced');
});

test('a malformed final form leaves no partially downloaded pins or forms', async () => {
  jest
    .mocked(fetchForms)
    .mockResolvedValue({ success: true, data: [{ id: 'f', pinId: 'missing' }] } as never);
  await expect(downloadLatest()).rejects.toThrow();
  expect(db.select().from(pins).all()).toHaveLength(0);
  expect(db.select().from(forms).all()).toHaveLength(0);
});

test.each([
  { longTermConditions: 'diabetes' },
  { longTermConditions: ['diabetes', 42] },
  { updatedAt: 'not-a-date' },
])('raw malformed answers or dates reject the whole snapshot: %j', async (invalid) => {
  jest.mocked(fetchForms).mockResolvedValue({
    success: true,
    data: [
      {
        id: 'f',
        pinId: 'remote',
        name: 'Patient',
        village: 'Krang Svat',
        villageId: '',
        createdAt: new Date(),
        version: 1,
        ...invalid,
      },
    ],
  } as never);
  await expect(downloadLatest()).rejects.toThrow();
  expect(db.select().from(pins).all()).toHaveLength(0);
  expect(db.select().from(forms).all()).toHaveLength(0);
});

test('a SQLite insertion failure rolls back the entire snapshot', async () => {
  db.run(
    "CREATE TRIGGER fail_pin BEFORE INSERT ON pins BEGIN SELECT RAISE(ABORT, 'insert failed'); END"
  );
  await expect(downloadLatest()).rejects.toThrow('insert failed');
  expect(db.select().from(pins).all()).toHaveLength(0);
});

test.each([{ images: ['../../SQLite/local.db'] }, { id: '../SQLite' }])(
  'unsafe downloaded file references reject the entire snapshot: %j',
  async (invalid) => {
    jest
      .mocked(fetchPins)
      .mockResolvedValue({ success: true, data: [{ ...serverPin, ...invalid }] } as never);
    await expect(downloadLatest()).rejects.toThrow(/unsafe|invalid/i);
    expect(db.select().from(pins).all()).toHaveLength(0);
  }
);

test('clearing is blocked by unsent work including orphaned unsynced records', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  await expect(clearLocalData()).rejects.toThrow();
  db.delete(syncQueue).run();
  await expect(clearLocalData()).rejects.toThrow();
  expect(db.select().from(pins).all()).toHaveLength(1);
});

test('clearing uploaded records allows a subsequent download', async () => {
  await createPin({ id: 'p', name: 'A', lat: 1, lng: 2 });
  db.update(pins).set({ status: 'synced' }).run();
  db.update(syncQueue).set({ status: 'completed' }).run();
  expect(await clearLocalData()).toEqual({ cleanupWarnings: [] });
  expect(db.select().from(pins).all()).toHaveLength(0);
  expect(await downloadLatest()).toEqual({ pins: 1, forms: 0 });
});
