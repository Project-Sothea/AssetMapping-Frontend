/** @jest-environment node */
import { createUploadTask } from 'expo-file-system/legacy';

import { forms, pins, syncQueue } from '~/db/schema';
import { updatePin } from '~/features/pins/services/PinService';
import { fetchPin } from '~/services/api/pinsApi';
import { deleteObjects, getUploadUrl } from '~/services/api/storageApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';

import { uploadPendingChanges } from '../queue/syncQueue';
import { finishSetup } from '../transferCoordinator';

import { createCurrentServer, createForm, createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

let mockExists = true;
let mockSize = 4;
const mockReadBytes = jest.fn();
const mockUpload = jest.fn();
const mockCancel = jest.fn();
jest.mock('expo-file-system/next', () => ({
  File: class {
    get exists() {
      return mockExists;
    }
    get size() {
      return mockSize;
    }
    bytes = mockReadBytes;
  },
}));
jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  FileSystemSessionType: { FOREGROUND: 1 },
  createUploadTask: jest.fn(() => ({ uploadAsync: mockUpload, cancelAsync: mockCancel })),
}));
jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({
  getLocalPath: (pinId: string, filename: string) => `file:///pins/${pinId}/${filename}`,
  deleteImagesByFilename: jest.fn(),
}));
jest.mock('~/services/api/pinsApi', () => ({ fetchPin: jest.fn() }));
jest.mock('~/services/api/storageApi', () => ({
  getUploadUrl: jest.fn(),
  deleteObjects: jest.fn(),
}));
jest.mock('~/services/api/syncApi', () => ({ sync: jest.fn() }));
const server = createCurrentServer();

beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockExists = true;
  mockSize = 4;
  mockReadBytes.mockRejectedValue(new Error('Must not buffer photo bytes in JavaScript'));
  mockUpload.mockResolvedValue({ status: 200, headers: {}, body: '' });
  mockCancel.mockResolvedValue(undefined);
  jest
    .mocked(getUploadUrl)
    .mockResolvedValue({ success: true, data: 'https://storage.example.test/photo' });
  server.clear();
  jest.mocked(fetchPin).mockReset().mockImplementation(server.fetchPin);
  jest.mocked(sync).mockReset().mockImplementation(server.sync);
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
async function photoPin(filename = 'photo.jpg') {
  await createPin({ id: 'p', name: 'Photo pin', lat: 1, lng: 2 });
  await updatePin('p', { images: [filename] });
}

test('large photo is uploaded from its file URI without allocating JS photo bytes', async () => {
  await photoPin();
  mockSize = 64 * 1024 * 1024;
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, failed: 0, remaining: 0 });
  expect(createUploadTask).toHaveBeenCalledWith(
    'https://storage.example.test/photo',
    'file:///pins/p/photo.jpg',
    expect.objectContaining({
      httpMethod: 'PUT',
      uploadType: 0,
      sessionType: 1,
      headers: { 'Content-Type': 'image/jpeg' },
    })
  );
  expect(mockReadBytes).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.status).toBe('synced');
});

test.each([
  ['photo.HEIC', 'image/heic'],
  ['photo.png', 'image/png'],
  ['photo.webp', 'image/webp'],
])('signs and sends %s with matching MIME type %s', async (filename, mimeType) => {
  await photoPin(filename);
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, failed: 0 });
  expect(getUploadUrl).toHaveBeenCalledWith(`pins/p/${filename}`, mimeType);
  expect(createUploadTask).toHaveBeenCalledWith(
    expect.any(String),
    `file:///pins/p/${filename}`,
    expect.objectContaining({ headers: { 'Content-Type': mimeType } })
  );
});

test('storage URL failure preserves the pin and dependent form with a stage-specific error', async () => {
  await photoPin();
  await createForm({ pinId: 'p', name: 'Test', villageId: '', village: 'Krang Svat' });
  jest
    .mocked(getUploadUrl)
    .mockResolvedValue({ success: false, error: 'HTTP 500: Internal Server Error' });
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ uploaded: 0, failed: 1, blocked: 1, remaining: 2 });
  expect(result.errors[0].message).toMatch(/photo.*upload URL.*500/i);
  expect(createUploadTask).not.toHaveBeenCalled();
  expect(sync).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.images).toBe('["photo.jpg"]');
  expect(db.select().from(forms).get()?.status).toBe('unsynced');
});

test.each(['missing', 'empty'])('%s local photo is retained as a failed upload', async (state) => {
  await photoPin();
  if (state === 'missing') mockExists = false;
  else mockSize = 0;
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/photo.jpg.*missing.*device/i);
  expect(getUploadUrl).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.status).toBe('unsynced');
});

test('timeout cancels the native task, retains the queue, and supports the next manual retry', async () => {
  await photoPin();
  mockUpload.mockImplementationOnce(() => new Promise(() => {}));
  const pending = uploadPendingChanges();
  await jest.advanceTimersByTimeAsync(60001);
  const result = await pending;
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/photo.*timed out/i);
  expect(mockCancel).toHaveBeenCalledTimes(1);
  const key = db.select().from(syncQueue).get()?.idempotencyKey;
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, remaining: 0 });
  expect(jest.mocked(sync).mock.calls[0][0].idempotencyKey).toBe(key);
});

test.each([undefined, null])(
  'native cancellation result %s cannot mark a pin uploaded',
  async (result) => {
    await photoPin();
    mockUpload.mockResolvedValueOnce(result);
    expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
    expect(sync).not.toHaveBeenCalled();
  }
);

test('native file read failure does not send metadata or discard the queued pin', async () => {
  await photoPin();
  mockUpload.mockRejectedValueOnce(new Error('Cannot read local file'));
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
  expect(sync).not.toHaveBeenCalled();
  expect(mockReadBytes).not.toHaveBeenCalled();
});

test('failed remote photo lookup never guesses that cached photos need reupload', async () => {
  await photoPin();
  await uploadPendingChanges();
  await updatePin('p', { name: 'Renamed' });
  jest
    .mocked(fetchPin)
    .mockImplementationOnce(server.fetchPin)
    .mockResolvedValueOnce({ success: false, error: 'Request timed out' });
  jest.mocked(createUploadTask).mockClear();
  jest.mocked(sync).mockClear();
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/check.*remote photo/i);
  expect(createUploadTask).not.toHaveBeenCalled();
  expect(sync).not.toHaveBeenCalled();
});

test('storage HTTP rejection does not mark the pin uploaded', async () => {
  await photoPin();
  mockUpload.mockResolvedValueOnce({ status: 403 });
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/photo.jpg.*HTTP 403/i);
  expect(sync).not.toHaveBeenCalled();
});

test('native errors never expose signed URL credentials', async () => {
  await photoPin();
  mockUpload.mockRejectedValueOnce(
    new Error('Network error https://storage.example.test/photo?signature=SECRET')
  );
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/could not upload/i);
  expect(result.errors[0].message).not.toContain('signature');
});

test('metadata-only edit does not need a local file for a photo already on the server', async () => {
  await photoPin();
  await uploadPendingChanges();
  await updatePin('p', { name: 'Renamed' });
  mockExists = false;
  jest.mocked(fetchPin).mockImplementation(server.fetchPin);
  jest.mocked(createUploadTask).mockClear();
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, remaining: 0 });
  expect(createUploadTask).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.status).toBe('synced');
});

test.each([{}, { images: null }, 'invalid pin'])(
  'malformed remote photo metadata %s prevents overwriting the server list',
  async (data) => {
    await photoPin();
    await uploadPendingChanges();
    await updatePin('p', { name: 'Renamed' });
    jest
      .mocked(fetchPin)
      .mockImplementationOnce(server.fetchPin)
      .mockResolvedValueOnce({ success: true, data } as never);
    jest.mocked(createUploadTask).mockClear();
    jest.mocked(getUploadUrl).mockClear();
    jest.mocked(sync).mockClear();
    const result = await uploadPendingChanges();
    expect(result).toMatchObject({ failed: 1, remaining: 1 });
    expect(result.errors[0].message).toMatch(/invalid image metadata/i);
    expect(getUploadUrl).not.toHaveBeenCalled();
    expect(createUploadTask).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
    expect(deleteObjects).not.toHaveBeenCalled();
  }
);
