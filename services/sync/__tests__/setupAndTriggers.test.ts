/** @jest-environment node */
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({ deleteImageByFilename: jest.fn() }));
jest.mock('~/services/api/pinsApi', () => ({ fetchPins: jest.fn() }));
jest.mock('~/services/api/formsApi', () => ({ fetchForms: jest.fn() }));

async function freshApp(marker: string | null, snapshot?: Uint8Array) {
  jest.resetModules();
  const storage = require('@react-native-async-storage/async-storage');
  storage.getItem.mockResolvedValue(marker);
  const testDb = require('./testDb');
  await testDb.initializeTestDb();
  testDb.resetTestDb(snapshot);
  const pinsApi = require('~/services/api/pinsApi');
  pinsApi.fetchPins.mockResolvedValue({ success: true, data: [] });
  const formsApi = require('~/services/api/formsApi');
  formsApi.fetchForms.mockResolvedValue({ success: true, data: [] });
  const schema = require('~/db/schema');
  return {
    storage,
    db: testDb.db,
    schema,
    pinsApi,
    formsApi,
    exportTestDb: testDb.exportTestDb,
    ...require('../syncService'),
    ...require('../transferCoordinator'),
  };
}

test('setup preserves existing clean records without an automatic download', async () => {
  const app = await freshApp(null);
  app.db
    .insert(app.schema.pins)
    .values({ id: 'old', name: 'Old', lat: 1, lng: 2, createdAt: new Date(), status: 'synced' })
    .run();
  await app.initializeLocalData();
  expect(app.db.select().from(app.schema.pins).all()).toHaveLength(1);
  expect(app.storage.setItem).toHaveBeenCalledWith('localDataResetVersion', '1');
  expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
  await app.initializeLocalData();
  expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
  expect(app.getTransferState().setupReady).toBe(true);
});

test('restarting after setup preserves SQLite responses and pending writes', async () => {
  const app = await freshApp(null);
  await app.initializeLocalData();
  app.db
    .insert(app.schema.pins)
    .values({
      id: 'new',
      name: 'New response',
      lat: 1,
      lng: 2,
      createdAt: new Date(),
      status: 'unsynced',
    })
    .run();
  app.db
    .insert(app.schema.syncQueue)
    .values({
      id: 'q',
      entityId: 'new',
      entityType: 'pin',
      operation: 'create',
      payload: '{}',
      status: 'pending',
      idempotencyKey: 'persisted-key',
    })
    .run();
  const restarted = await freshApp('1', app.exportTestDb());
  await restarted.initializeLocalData();
  expect(restarted.db.select().from(restarted.schema.pins).get()?.name).toBe('New response');
  expect(restarted.db.select().from(restarted.schema.syncQueue).get()?.idempotencyKey).toBe(
    'persisted-key'
  );
  expect(restarted.pinsApi.fetchPins).not.toHaveBeenCalled();
});

test('an existing reset marker preserves local records and performs no automatic download', async () => {
  const app = await freshApp('1');
  app.db
    .insert(app.schema.pins)
    .values({ id: 'old', name: 'Saved', lat: 1, lng: 2, createdAt: new Date() })
    .run();
  await app.initializeLocalData();
  expect(app.db.select().from(app.schema.pins).all()).toHaveLength(1);
  expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
});

test.each(['pending', 'failed'])(
  'missing marker permits existing %s work and NULL-status rows without changing or sending them',
  async (queueStatus) => {
    const app = await freshApp(null);
    app.db
      .insert(app.schema.pins)
      .values({
        id: 'saved-pin',
        name: 'Saved pin',
        lat: 1,
        lng: 2,
        createdAt: new Date(),
        status: null,
      })
      .run();
    app.db
      .insert(app.schema.forms)
      .values({
        id: 'saved-form',
        pinId: 'saved-pin',
        name: 'Saved form',
        village: 'Krang Svat',
        villageId: 'QA1',
        createdAt: new Date(),
        status: null,
        dataCollectionDate: '22 May 2026',
      })
      .run();
    app.db
      .insert(app.schema.syncQueue)
      .values({
        id: 'saved-operation',
        entityId: 'saved-form',
        entityType: 'form',
        operation: 'create',
        payload: JSON.stringify({ id: 'saved-form', pinId: 'saved-pin', version: 1 }),
        status: queueStatus,
        attempts: queueStatus === 'failed' ? 2 : 0,
        idempotencyKey: 'saved-revision',
        lastError: queueStatus === 'failed' ? 'Offline' : null,
      })
      .run();
    const snapshot = () => ({
      pins: app.db.select().from(app.schema.pins).all(),
      forms: app.db.select().from(app.schema.forms).all(),
      queue: app.db.select().from(app.schema.syncQueue).all(),
    });
    const before = snapshot();
    await app.initializeLocalData();
    expect(app.getTransferState().setupReady).toBe(true);
    expect(app.assertLocalWritesAllowed).not.toThrow();
    expect(snapshot()).toEqual(before);
    expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
    expect(app.formsApi.fetchForms).not.toHaveBeenCalled();
    expect(app.storage.setItem).toHaveBeenCalledWith('localDataResetVersion', '1');
    const restarted = await freshApp('1', app.exportTestDb());
    await restarted.initializeLocalData();
    expect(restarted.getTransferState().setupReady).toBe(true);
    expect(restarted.db.select().from(restarted.schema.pins).all()).toEqual(before.pins);
    expect(restarted.db.select().from(restarted.schema.forms).all()).toEqual(before.forms);
    expect(restarted.db.select().from(restarted.schema.syncQueue).all()).toEqual(before.queue);
    expect(restarted.pinsApi.fetchPins).not.toHaveBeenCalled();
    expect(restarted.formsApi.fetchForms).not.toHaveBeenCalled();
  }
);

test.each([null, 'unsynced'])(
  '%s-status records without an outbox remain visible without creating upload operations',
  async (status) => {
    const app = await freshApp(null);
    app.db
      .insert(app.schema.pins)
      .values({ id: 'saved', name: 'Not queued', lat: 1, lng: 2, createdAt: new Date(), status })
      .run();
    await app.initializeLocalData();
    expect(app.getTransferState().setupReady).toBe(true);
    expect(app.db.select().from(app.schema.pins).get()?.status).toBe(status);
    expect(app.db.select().from(app.schema.syncQueue).all()).toHaveLength(0);
    expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
  }
);

test.each(['queue', 'completed queue', 'journal'])(
  'an otherwise empty database with retained %s history does not download automatically',
  async (retained) => {
    const app = await freshApp(null);
    const table = retained === 'journal' ? app.schema.syncInflight : app.schema.syncQueue;
    const row =
      retained !== 'journal'
        ? {
            id: 'saved-operation',
            entityId: 'saved-pin',
            entityType: 'pin',
            operation: 'create',
            payload: JSON.stringify({ id: 'saved-pin' }),
            status: retained === 'completed queue' ? 'completed' : 'failed',
            idempotencyKey: 'saved-revision',
          }
        : {
            key: 'saved-revision',
            queueId: 'saved-operation',
            entityId: 'saved-pin',
            entityType: 'pin',
            operation: JSON.stringify({ id: 'saved-operation' }),
            status: 'pending',
          };
    app.db.insert(table).values(row).run();
    const before = app.db.select().from(table).all();
    await app.initializeLocalData();
    expect(app.getTransferState().setupReady).toBe(true);
    expect(app.db.select().from(table).all()).toEqual(before);
    expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
    expect(app.formsApi.fetchForms).not.toHaveBeenCalled();
  }
);

test('only first setup on a completely empty database downloads automatically', async () => {
  const app = await freshApp(null);
  await app.initializeLocalData();
  expect(app.getTransferState().setupReady).toBe(true);
  expect(app.storage.setItem).toHaveBeenCalledWith('localDataResetVersion', '1');
  expect(app.pinsApi.fetchPins).toHaveBeenCalledTimes(1);
  expect(app.formsApi.fetchForms).toHaveBeenCalledTimes(1);
  await app.initializeLocalData();
  expect(app.pinsApi.fetchPins).toHaveBeenCalledTimes(1);
  const restarted = await freshApp('1', app.exportTestDb());
  await restarted.initializeLocalData();
  expect(restarted.pinsApi.fetchPins).not.toHaveBeenCalled();
  expect(restarted.formsApi.fetchForms).not.toHaveBeenCalled();
});

test('an unknown non-null reset marker fails closed without deleting responses', async () => {
  const app = await freshApp('unexpected-future-version');
  app.db
    .insert(app.schema.pins)
    .values({
      id: 'saved',
      name: 'Unsent',
      lat: 1,
      lng: 2,
      createdAt: new Date(),
      status: 'unsynced',
    })
    .run();
  await expect(app.initializeLocalData()).rejects.toThrow(/reset|version|marker/i);
  expect(app.db.select().from(app.schema.pins).all()).toHaveLength(1);
  expect(app.getTransferState().setupReady).toBe(false);
  expect(app.pinsApi.fetchPins).not.toHaveBeenCalled();
  expect(app.storage.setItem).not.toHaveBeenCalled();
});

test('failed initial network download retains marker, unlocks editing, and never auto-retries', async () => {
  const app = await freshApp(null);
  app.pinsApi.fetchPins.mockResolvedValue({ success: false, error: 'Offline' });
  await expect(app.initializeLocalData()).rejects.toThrow('Offline');
  expect(app.storage.setItem).toHaveBeenCalledWith('localDataResetVersion', '1');
  expect(app.getTransferState().setupReady).toBe(true);
  await app.initializeLocalData();
  expect(app.pinsApi.fetchPins).toHaveBeenCalledTimes(1);
});

test('reset marker storage failure keeps editing locked and allows setup retry', async () => {
  const app = await freshApp(null);
  app.storage.setItem.mockRejectedValueOnce(new Error('Storage unavailable'));
  await expect(app.initializeLocalData()).rejects.toThrow('Storage unavailable');
  expect(app.getTransferState().setupReady).toBe(false);
  await app.initializeLocalData();
  expect(app.getTransferState().setupReady).toBe(true);
});

test('reconnect hooks, notifications and API URL save have no transfer call sites', () => {
  for (const path of [
    'hooks/RealTimeSync/useRealTimeSync.ts',
    'services/websocket/WebSocketManager.ts',
    'features/sync/components/ApiUrlConfiguration.tsx',
  ]) {
    const source = readFileSync(join(__dirname, '../../..', path), 'utf8');
    expect(source).not.toMatch(
      /processQueue|performFullSync|performIncrementalSync|reconnectAndSync|pullPinUpdate|pullFormUpdate/
    );
  }
});
