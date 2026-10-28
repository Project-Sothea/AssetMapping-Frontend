/** @jest-environment node */
import { File } from 'expo-file-system/next';

import { pins, syncInflight, syncQueue } from '~/db/schema';
import { deletePin, updatePin } from '~/features/pins/services/PinService';
import { fetchPin } from '~/services/api/pinsApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';
import { deletePinImageDirectory } from '~/services/images/ImageManager';

import { uploadPendingChanges } from '../queue/syncQueue';
import { finishSetup } from '../transferCoordinator';

import { createCurrentServer, createPin } from './fixtures';
import { exportTestDb, initializeTestDb, resetTestDb } from './testDb';

const mockPhotos = new Set<string>();
const mockUploadedPhotos = new Set<string>();
const server = createCurrentServer();
const mockServerPins = server.pins;
const mockNativeUpload = jest.fn();
let mockLoseReply = false;
let mockFailBeforeMetadata = false;
jest.mock('expo-file-system/next', () => ({
  File: class {
    private uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockPhotos.has(this.uri);
    }
    get size() {
      return this.exists ? 4 : 0;
    }
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  FileSystemSessionType: { FOREGROUND: 1 },
  createUploadTask: (_url: string, uri: string) => ({
    uploadAsync: async () => {
      const result = await mockNativeUpload();
      if (result?.status >= 200 && result.status < 300) mockUploadedPhotos.add(uri);
      return result;
    },
    cancelAsync: async () => {},
  }),
}));
jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({
  getLocalPath: (pinId: string, filename: string) => `file:///pins/${pinId}/${filename}`,
  deleteImagesByFilename: jest.fn(async (pinId: string, filenames: string[]) => {
    for (const filename of filenames) mockPhotos.delete(`file:///pins/${pinId}/${filename}`);
  }),
  deletePinImageDirectory: jest.fn(async (pinId: string) => {
    for (const uri of mockPhotos)
      if (uri.startsWith(`file:///pins/${pinId}/`)) mockPhotos.delete(uri);
  }),
}));
jest.mock('~/services/api/pinsApi', () => ({ fetchPin: jest.fn() }));
jest.mock('~/services/api/storageApi', () => ({
  getUploadUrl: async () => ({ success: true, data: 'https://storage.example.test/photo' }),
  deleteObjects: async () => ({ success: true, data: {} }),
}));
jest.mock('~/services/api/syncApi', () => ({ sync: jest.fn() }));

beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  jest.clearAllMocks();
  mockPhotos.clear();
  mockPhotos.add('file:///pins/p/photo.jpg');
  mockUploadedPhotos.clear();
  server.clear();
  mockLoseReply = false;
  mockFailBeforeMetadata = false;
  mockNativeUpload.mockReset().mockResolvedValue({ status: 200 });
  jest.mocked(fetchPin).mockImplementation(server.fetchPin);
  jest.mocked(sync).mockImplementation(async (request) => {
    if (mockFailBeforeMetadata) {
      mockFailBeforeMetadata = false;
      throw new Error('Network timeout before metadata commit');
    }
    const result = server.commit(request);
    if (mockLoseReply) {
      mockLoseReply = false;
      throw new Error('Network timeout after server commit');
    }
    return result;
  });
});

async function photoPin() {
  await createPin({ id: 'p', name: 'QA photo pin', lat: 1, lng: 2 });
  await updatePin('p', { images: ['photo.jpg'] });
}

function expectDeletionComplete() {
  expect(mockPhotos.size).toBe(0);
  expect(mockServerPins.has('p')).toBe(false);
  expect(db.select().from(pins).all()).toHaveLength(0);
  expect(db.select().from(syncInflight).all()).toHaveLength(0);
  const queue = db.select().from(syncQueue).all();
  expect(queue.every((row) => row.status === 'completed')).toBe(true);
  expect(queue.filter((row) => row.operation === 'delete')).toEqual([
    expect.objectContaining({ entityType: 'pin', operation: 'delete', status: 'completed' }),
  ]);
}

// These reload an exported SQLite image while deliberately retaining simulated
// remote state/photos. Actual OS force-stop and native filesystem persistence
// still require Android/iOS device QA.
describe('current-server photo deletion recovery', () => {
  test('lost create ACK retains photos through reload and repeated contract-specific replay failures', async () => {
    await photoPin();
    mockLoseReply = true;
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
    expect(mockServerPins.has('p')).toBe(true);
    await deletePin('p');
    expect(new File('file:///pins/p/photo.jpg').exists).toBe(true);
    expect(deletePinImageDirectory).not.toHaveBeenCalled();
    resetTestDb(exportTestDb());
    for (let attempt = 0; attempt < 3; attempt++) {
      jest
        .mocked(fetchPin)
        .mockResolvedValueOnce({ success: false, error: 'HTTP 503: Network unavailable' });
      expect(await uploadPendingChanges()).toMatchObject({ failed: 1, blocked: 1, remaining: 1 });
      expect(new File('file:///pins/p/photo.jpg').exists).toBe(true);
      expect(db.select().from(syncInflight).all()).toHaveLength(1);
    }
    expect(await uploadPendingChanges()).toMatchObject({ uploaded: 2, failed: 0, remaining: 0 });
    expectDeletionComplete();
    expect(mockNativeUpload).toHaveBeenCalledTimes(1);
    expect(jest.mocked(sync).mock.calls.map(([request]) => request.operation)).toEqual([
      'create',
      'delete',
    ]);
  });

  test('photo uploaded but metadata never committed retains its journal and file until replay then deletion', async () => {
    await photoPin();
    mockFailBeforeMetadata = true;
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
    expect(mockUploadedPhotos.has('file:///pins/p/photo.jpg')).toBe(true);
    expect(mockServerPins.has('p')).toBe(false);
    await deletePin('p');
    resetTestDb(exportTestDb());
    for (let attempt = 0; attempt < 3; attempt++) {
      mockNativeUpload.mockRejectedValueOnce(new Error('Network error during repeated photo PUT'));
      expect(await uploadPendingChanges()).toMatchObject({ failed: 1, blocked: 1, remaining: 1 });
      expect(mockPhotos.size).toBe(1);
      expect(mockServerPins.has('p')).toBe(false);
      expect(db.select().from(syncInflight).all()).toHaveLength(1);
    }
    expect(await uploadPendingChanges()).toMatchObject({ uploaded: 2, failed: 0, remaining: 0 });
    expectDeletionComplete();
    expect(jest.mocked(sync).mock.calls.map(([request]) => request.operation)).toEqual([
      'create',
      'create',
      'delete',
    ]);
  });

  test('never-transmitted photo pin cancellation cleans its files without a server request', async () => {
    await photoPin();
    await deletePin('p');
    expect(db.select().from(syncQueue).all()).toHaveLength(0);
    expect(db.select().from(pins).all()).toHaveLength(0);
    expect(mockPhotos.size).toBe(0);
    expect(sync).not.toHaveBeenCalled();
    expect(fetchPin).not.toHaveBeenCalled();
  });

  test('removing a photo from the latest edit still retains the older journal photo until confirmed deletion', async () => {
    await photoPin();
    mockLoseReply = true;
    await uploadPendingChanges();
    await updatePin('p', { images: [] });
    await deletePin('p');
    expect(mockPhotos.size).toBe(1);
    expect(await uploadPendingChanges()).toMatchObject({ failed: 0, remaining: 0 });
    expectDeletionComplete();
  });

  test('lost update ACK recovers the older revision and rebases deletion to its confirmed version', async () => {
    await photoPin();
    await uploadPendingChanges();
    mockPhotos.add('file:///pins/p/added.jpg');
    await updatePin('p', { images: ['photo.jpg', 'added.jpg'], name: 'QA changed photo pin' });
    mockLoseReply = true;
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
    expect(mockServerPins.get('p')?.version).toBe(2);
    await deletePin('p');
    expect(mockPhotos.size).toBe(2);
    resetTestDb(exportTestDb());
    expect(await uploadPendingChanges()).toMatchObject({ uploaded: 2, failed: 0, remaining: 0 });
    expectDeletionComplete();
    const requests = jest.mocked(sync).mock.calls.map(([request]) => request);
    expect(requests.at(-1)).toMatchObject({
      operation: 'delete',
      payload: { id: 'p', version: 2 },
    });
    expect(requests.filter((request) => request.operation === 'update')).toHaveLength(1);
  });

  test('lost delete ACK preserves files across reload until GET404 confirms deletion', async () => {
    await photoPin();
    await uploadPendingChanges();
    await deletePin('p');
    mockLoseReply = true;
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
    expect(mockPhotos.size).toBe(1);
    expect(mockServerPins.has('p')).toBe(false);
    resetTestDb(exportTestDb());
    expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, failed: 0, remaining: 0 });
    expectDeletionComplete();
    expect(
      jest.mocked(sync).mock.calls.filter(([request]) => request.operation === 'delete')
    ).toHaveLength(1);
  });

  test('cleanup failure after persisted ACK recovers on a subsequent explicit upload after database reload', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await photoPin();
      await uploadPendingChanges();
      await deletePin('p');
      jest
        .mocked(deletePinImageDirectory)
        .mockRejectedValueOnce(new Error('Local file temporarily busy'));
      expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, failed: 0, remaining: 0 });
      expect(mockPhotos.size).toBe(1);
      expect(mockServerPins.has('p')).toBe(false);
      expect(db.select().from(syncInflight).all()).toHaveLength(0);
      resetTestDb(exportTestDb());
      const requestsBeforeCleanup = jest.mocked(sync).mock.calls.length;
      expect(await uploadPendingChanges()).toMatchObject({ uploaded: 0, remaining: 0 });
      expect(jest.mocked(sync).mock.calls).toHaveLength(requestsBeforeCleanup);
      expectDeletionComplete();
    } finally {
      warn.mockRestore();
    }
  });
});
