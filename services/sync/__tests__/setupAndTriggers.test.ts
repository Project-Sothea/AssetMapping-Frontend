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
  require('~/services/api/formsApi').fetchForms.mockResolvedValue({ success: true, data: [] });
  const schema = require('~/db/schema');
  return {
    storage,
    db: testDb.db,
    schema,
    pinsApi,
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
