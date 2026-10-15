/** @jest-environment node */
import { eq } from 'drizzle-orm';
import { fetch as nativeFetch } from 'expo/fetch';

import { forms, pins, syncQueue } from '~/db/schema';
import { updatePin } from '~/features/pins/services/PinService';
import { fetchPin } from '~/services/api/pinsApi';
import { deleteObjects, getUploadUrl } from '~/services/api/storageApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';

import { uploadPendingChanges } from '../queue/syncQueue';
import { finishSetup } from '../transferCoordinator';

import { createForm, createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

const mockBytes = new Uint8Array([137, 80, 78, 71]);
let mockExists = true;
let mockSize = 4;
let mockReadFailure = false;
jest.mock('expo-file-system/next', () => ({
  File: class {
    get exists() {
      return mockExists;
    }
    get size() {
      return mockSize;
    }
    bytes = async () => {
      if (mockReadFailure) throw new Error('Cannot read file');
      return mockBytes;
    };
  },
}));
jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
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

beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockExists = true;
  mockSize = 4;
  mockReadFailure = false;
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Cannot fetch file:// URI'));
  jest
    .mocked(nativeFetch)
    .mockResolvedValue({ ok: true, status: 200 } as Awaited<ReturnType<typeof nativeFetch>>);
  jest
    .mocked(getUploadUrl)
    .mockResolvedValue({ success: true, data: 'https://storage.example.test/photo' });
  jest.mocked(fetchPin).mockResolvedValue({ success: true, data: { images: [] } } as never);
  jest.mocked(sync).mockResolvedValue({ success: true, data: { version: 2 } } as never);
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function photoPin(filename = 'photo.jpg') {
  await createPin({ id: 'p', name: 'Photo pin', lat: 1, lng: 2 });
  await updatePin('p', { images: [filename] });
}

test('uploads native file bytes without fetching a file URI and completes the pin', async () => {
  await photoPin();
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, failed: 0, remaining: 0 });
  expect(nativeFetch).toHaveBeenCalledWith(
    'https://storage.example.test/photo',
    expect.objectContaining({
      method: 'PUT',
      body: mockBytes,
      headers: { 'Content-Type': 'image/jpeg' },
    })
  );
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
  expect(nativeFetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ headers: { 'Content-Type': mimeType } })
  );
});

test('storage URL failure identifies the stage and preserves the pin and dependent form', async () => {
  await photoPin();
  await createForm({ pinId: 'p', name: 'Test', villageId: '', village: 'Krang Svat' });
  jest
    .mocked(getUploadUrl)
    .mockResolvedValue({ success: false, error: 'HTTP 500: Internal Server Error' });
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ uploaded: 0, failed: 1, blocked: 1, remaining: 2 });
  expect(result.errors[0].message).toMatch(/photo.*upload URL.*500/i);
  expect(sync).not.toHaveBeenCalled();
  expect(nativeFetch).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.images).toBe('["photo.jpg"]');
  expect(db.select().from(forms).get()?.status).toBe('unsynced');
  expect(db.select().from(syncQueue).where(eq(syncQueue.entityType, 'pin')).get()?.status).toBe(
    'failed'
  );
});

test('missing local photo fails before requesting an upload URL and retains pending data', async () => {
  await photoPin();
  mockExists = false;
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/photo.jpg.*missing.*device/i);
  expect(getUploadUrl).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.status).toBe('unsynced');
});

test('photo upload times out and can be retried in a subsequent manual session', async () => {
  await photoPin();
  jest.mocked(nativeFetch).mockImplementationOnce(
    (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        );
      })
  );
  const pending = uploadPendingChanges();
  await jest.advanceTimersByTimeAsync(60001);
  const failed = await pending;
  expect(failed).toMatchObject({ failed: 1, remaining: 1 });
  expect(failed.errors[0].message).toMatch(/photo.*timed out/i);
  const key = db.select().from(syncQueue).get()?.idempotencyKey;
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, remaining: 0 });
  expect(jest.mocked(sync).mock.calls[0][0].idempotencyKey).toBe(key);
});

test('empty local photo cannot be marked uploaded', async () => {
  await photoPin();
  mockSize = 0;
  expect(await uploadPendingChanges()).toMatchObject({ failed: 1, remaining: 1 });
  expect(getUploadUrl).not.toHaveBeenCalled();
  expect(sync).not.toHaveBeenCalled();
});

test('native file read failure keeps the pin pending without sending incomplete bytes', async () => {
  await photoPin();
  mockReadFailure = true;
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/photo.jpg.*could not be read/i);
  expect(nativeFetch).not.toHaveBeenCalled();
  expect(sync).not.toHaveBeenCalled();
});

test('failed remote image lookup does not guess that existing photos need reuploading', async () => {
  await photoPin();
  await uploadPendingChanges();
  await updatePin('p', { name: 'Renamed' });
  jest.mocked(fetchPin).mockResolvedValue({ success: false, error: 'Request timed out' });
  jest.mocked(nativeFetch).mockClear();
  jest.mocked(sync).mockClear();
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/check.*remote photo/i);
  expect(nativeFetch).not.toHaveBeenCalled();
  expect(sync).not.toHaveBeenCalled();
});

test('storage rejection keeps the pin queued and reports the photo HTTP status', async () => {
  await photoPin();
  jest
    .mocked(nativeFetch)
    .mockResolvedValueOnce({ ok: false, status: 403 } as Awaited<ReturnType<typeof nativeFetch>>);
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ uploaded: 0, failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/photo.jpg.*HTTP 403/i);
  expect(sync).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.status).toBe('unsynced');
});

test('native upload errors do not expose signed URL credentials', async () => {
  await photoPin();
  jest
    .mocked(nativeFetch)
    .mockRejectedValueOnce(
      new Error('Network error https://storage.example.test/photo?signature=SECRET')
    );
  const result = await uploadPendingChanges();
  expect(result).toMatchObject({ failed: 1, remaining: 1 });
  expect(result.errors[0].message).toMatch(/could not upload/i);
  expect(result.errors[0].message).not.toContain('signature');
});

test('editing metadata for an existing remote photo does not require a local cached file', async () => {
  await photoPin();
  await uploadPendingChanges();
  await updatePin('p', { name: 'Renamed' });
  mockExists = false;
  jest
    .mocked(fetchPin)
    .mockResolvedValue({ success: true, data: { images: ['photo.jpg'] } } as never);
  jest.mocked(nativeFetch).mockClear();
  expect(await uploadPendingChanges()).toMatchObject({ uploaded: 1, failed: 0, remaining: 0 });
  expect(nativeFetch).not.toHaveBeenCalled();
  expect(db.select().from(pins).get()?.name).toBe('Renamed');
  expect(db.select().from(pins).get()?.status).toBe('synced');
});

test.each([{}, { images: null }, 'invalid pin'])(
  'malformed remote photo metadata %s prevents overwriting the server image list',
  async (data) => {
    await photoPin();
    await uploadPendingChanges();
    await updatePin('p', { name: 'Renamed' });
    jest.mocked(fetchPin).mockResolvedValue({ success: true, data } as never);
    jest.mocked(nativeFetch).mockClear();
    jest.mocked(getUploadUrl).mockClear();
    jest.mocked(sync).mockClear();
    const result = await uploadPendingChanges();
    expect(result).toMatchObject({ failed: 1, remaining: 1 });
    expect(result.errors[0].message).toMatch(/invalid image metadata/i);
    expect(getUploadUrl).not.toHaveBeenCalled();
    expect(nativeFetch).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
    expect(deleteObjects).not.toHaveBeenCalled();
  }
);
