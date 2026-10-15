/** @jest-environment node */
import { forms, pins, syncQueue } from '~/db/schema';
import { updateForm, deleteForm } from '~/features/forms/services/FormService';
import { deletePin, updatePin } from '~/features/pins/services/PinService';
import { db } from '~/services/drizzleDb';

import { assertLocalWritesAllowed, finishSetup, runTransfer } from '../transferCoordinator';

import { createForm, createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({ deleteImagesByFilename: jest.fn() }));

const pin = { id: 'pin-1', name: 'A1', lat: 1, lng: 2 };

beforeAll(initializeTestDb);
beforeEach(() => {
  jest.useFakeTimers();
  resetTestDb();
  finishSetup();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('transfers exclude overlapping transfers and stale editor writes', async () => {
  await createPin(pin);
  const form = await createForm({
    pinId: pin.id,
    name: 'Patient',
    villageId: '',
    village: 'Krang Svat',
  });
  let release!: () => void;
  const transfer = runTransfer(
    'upload',
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  expect(assertLocalWritesAllowed).toThrow();
  await expect(createPin(pin)).rejects.toThrow();
  await expect(updatePin(pin.id, { name: 'Changed during upload' })).rejects.toThrow();
  await expect(deletePin(pin.id)).rejects.toThrow();
  await expect(
    createForm({ pinId: pin.id, name: 'Another', villageId: '', village: 'Krang Svat' })
  ).rejects.toThrow();
  await expect(updateForm(form.id, { name: 'Changed during upload' })).rejects.toThrow();
  await expect(deleteForm(form.id)).rejects.toThrow();
  await expect(runTransfer('clear', async () => {})).rejects.toThrow();
  release();
  await transfer;
  expect(assertLocalWritesAllowed).not.toThrow();
});

test('editing an unsent pin preserves its create operation', async () => {
  await createPin(pin);
  await updatePin(pin.id, { name: 'A2' });
  expect(db.select().from(syncQueue).all()).toEqual([
    expect.objectContaining({ operation: 'create', payload: expect.stringContaining('A2') }),
  ]);
});

test('saving a form on an unsent pin retains parent create', async () => {
  await createPin(pin);
  await createForm({ pinId: pin.id, name: 'Patient', villageId: '', village: 'Krang Svat' });
  expect(db.select().from(forms).all()).toHaveLength(1);
  expect(db.select().from(syncQueue).all()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ entityType: 'pin', operation: 'create' }),
      expect.objectContaining({ entityType: 'form', operation: 'create' }),
    ])
  );
});

test('queue insert failure rolls back the local pin save', async () => {
  db.run(
    "CREATE TRIGGER fail_queue BEFORE INSERT ON sync_queue BEGIN SELECT RAISE(ABORT, 'queue failed'); END"
  );
  await expect(createPin(pin)).rejects.toThrow('queue failed');
  expect(db.select().from(pins).all()).toHaveLength(0);
});

test('deleting a never-uploaded pin cancels its child records and operations', async () => {
  await createPin(pin);
  await createForm({ pinId: pin.id, name: 'Patient', villageId: '', village: 'Krang Svat' });
  await deletePin(pin.id);
  expect(db.select().from(pins).all()).toHaveLength(0);
  expect(db.select().from(forms).all()).toHaveLength(0);
  expect(db.select().from(syncQueue).all()).toHaveLength(0);
});
