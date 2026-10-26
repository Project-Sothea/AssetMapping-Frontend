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

import { createPin } from './fixtures';
import { exportTestDb, initializeTestDb, resetTestDb } from './testDb';

const mockPhotos = new Set<string>();
const mockServerPins = new Map<string, Record<string, unknown>>();
const mockReceipts = new Map<string, Record<string, unknown>>();
const mockNativeUpload = jest.fn();
let mockLoseReply = false;
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
  createUploadTask: () => ({ uploadAsync: mockNativeUpload, cancelAsync: async () => {} }),
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
  mockServerPins.clear();
  mockReceipts.clear();
  mockLoseReply = false;
  mockNativeUpload.mockReset().mockResolvedValue({ status: 200 });
  jest
    .mocked(fetchPin)
    .mockImplementation(async (id) => ({ success: true, data: mockServerPins.get(id) }) as never);
  jest.mocked(sync).mockImplementation(async (request) => {
    let result = mockReceipts.get(request.idempotencyKey);
    if (!result) {
      result =
        request.operation === 'delete'
          ? { id: request.payload.id, deleted: true }
          : {
              ...request.payload,
              version: request.operation === 'create' ? 1 : Number(request.payload.version) + 1,
            };
      mockReceipts.set(request.idempotencyKey, result);
      if (request.operation === 'delete') mockServerPins.delete(String(request.payload.id));
      else mockServerPins.set(String(request.payload.id), result);
    }
    if (mockLoseReply) {
      mockLoseReply = false;
      throw new Error('Network timeout after server commit');
    }
    return { success: true, data: result } as never;
  });
});

async function photoPin() {
  await createPin({ id: 'p', name: 'QA photo pin', lat: 1, lng: 2 });
  await updatePin('p', { images: ['photo.jpg'] });
}

test('deleting a photo pin after lost ACK retains its files across restart/retries until deletion is confirmed', async () => {
  await photoPin();
  mockLoseReply = true;
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
  await deletePin('p');
  expect(new File('file:///pins/p/photo.jpg').exists).toBe(true);
  expect(deletePinImageDirectory).not.toHaveBeenCalled();
  resetTestDb(exportTestDb());
  for (let attempt = 0; attempt < 3; attempt++) {
    mockNativeUpload.mockRejectedValueOnce(new Error('Network error'));
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, blocked: 1, remaining: 1 });
    expect(new File('file:///pins/p/photo.jpg').exists).toBe(true);
  }
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 2, failed: 0, remaining: 0 });
  expect(mockPhotos.size).toBe(0);
  expect(mockServerPins.has('p')).toBe(false);
  expect(db.select().from(syncInflight).all()).toHaveLength(0);
});

test('never-transmitted photo pin cancellation can clean its files immediately', async () => {
  await photoPin();
  await deletePin('p');
  expect(db.select().from(syncQueue).all()).toHaveLength(0);
  expect(db.select().from(pins).all()).toHaveLength(0);
  expect(mockPhotos.size).toBe(0);
  expect(sync).not.toHaveBeenCalled();
});

test('deleting after removing a photo from the latest edit still retains the older journal photo', async () => {
  await photoPin();
  mockLoseReply = true;
  await uploadPendingChanges();
  await updatePin('p', { images: [] });
  await deletePin('p');
  expect(mockPhotos.size).toBe(1);
  expect(await uploadPendingChanges()).toMatchObject({ failed: 0, remaining: 0 });
  expect(mockPhotos.size).toBe(0);
});

test('failed delete keeps local photos until its acknowledgement succeeds', async () => {
  await photoPin();
  await uploadPendingChanges();
  await deletePin('p');
  mockLoseReply = true;
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
  expect(mockPhotos.size).toBe(1);
  expect(await uploadPendingChanges()).toMatchObject({ remaining: 0 });
  expect(mockPhotos.size).toBe(0);
});

test('interrupted local cleanup is retried after restart without invalidating the server deletion', async () => {
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
    resetTestDb(exportTestDb());
    expect(await uploadPendingChanges()).toMatchObject({ uploaded: 0, remaining: 0 });
    expect(mockPhotos.size).toBe(0);
  } finally {
    warn.mockRestore();
  }
});
