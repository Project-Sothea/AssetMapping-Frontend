/** @jest-environment node */
import { pins } from '~/db/schema';
import { updatePin } from '~/features/pins/services/PinService';
import { fetchPin } from '~/services/api/pinsApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';

import { uploadPendingChanges } from '../queue/syncQueue';
import { finishSetup } from '../transferCoordinator';

import { createCurrentServer, createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

const mockListeners = new Set<object>();
const mockNativeUpload = jest.fn();
const mockNativeCancel = jest.fn();
jest.mock('expo-file-system/src/legacy/ExponentFileSystem', () => ({
  __esModule: true,
  default: {
    documentDirectory: 'file:///documents/',
    cacheDirectory: 'file:///cache/',
    uploadTaskStartAsync: (...args: unknown[]) => mockNativeUpload(...args),
    networkTaskCancelAsync: (...args: unknown[]) => mockNativeCancel(...args),
    addListener: () => {
      const subscription = { remove: () => mockListeners.delete(subscription) };
      mockListeners.add(subscription);
      return subscription;
    },
  },
}));
jest.mock('expo-file-system/next', () => ({
  File: class {
    exists = true;
    size = 4;
  },
}));
jest.mock('~/services/images/ImageManager', () => ({
  getLocalPath: () => 'file:///pins/p/photo.jpg',
}));
jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/api/storageApi', () => ({
  getUploadUrl: async () => ({ success: true, data: 'https://storage.example.test/photo' }),
}));
jest.mock('~/services/api/syncApi', () => ({ sync: jest.fn() }));
jest.mock('~/services/api/pinsApi', () => ({ fetchPin: jest.fn() }));
const server = createCurrentServer();

beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  server.clear();
  jest.mocked(fetchPin).mockImplementation(server.fetchPin);
  jest.mocked(sync).mockImplementation(server.sync);
  mockListeners.clear();
  mockNativeUpload.mockReset().mockRejectedValue(new Error('Native network failed'));
  mockNativeCancel.mockReset().mockResolvedValue(undefined);
});

test('real Expo upload wrapper leaves no progress listeners behind across failed manual retries', async () => {
  await createPin({ id: 'p', name: 'Test', lat: 1, lng: 2 });
  await updatePin('p', { images: ['photo.jpg'] });
  for (let i = 0; i < 3; i++) {
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
    expect(mockListeners.size).toBe(0);
  }
  expect(mockNativeCancel).toHaveBeenCalledTimes(3);
  mockNativeUpload.mockResolvedValueOnce({ status: 200 });
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, remaining: 0 });
  expect(mockListeners.size).toBe(0);
  expect(db.select().from(pins).get()?.status).toBe('synced');
});
