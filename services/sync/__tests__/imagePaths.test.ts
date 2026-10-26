/** @jest-environment node */
import * as images from '~/services/images/ImageManager';

const mockNativePath = jest.fn();
const mockDelete = jest.fn();
const mockDownload = jest.fn();
jest.mock('expo-file-system/next', () => ({
  Paths: { document: 'file:///documents' },
  Directory: class {
    uri: string;
    exists = true;
    constructor(...parts: ({ uri: string } | string)[]) {
      mockNativePath();
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
  },
  File: class {
    uri: string;
    exists = true;
    delete = mockDelete;
    copy = jest.fn();
    static downloadFileAsync = mockDownload;
    constructor(...parts: ({ uri: string } | string)[]) {
      mockNativePath();
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
  },
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('~/services/api/storageApi', () => ({ getDownloadUrl: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test.each([
  ['pin', '../../SQLite/local.db'],
  ['../../SQLite', 'local.db'],
  ['pin', '..'],
  ['..', 'photo.jpg'],
  ['pin', '/absolute.jpg'],
  ['pin', '..\\..\\local.db'],
  ['pin', '%2e%2e%2flocal.db'],
  ['pin', 'file:photo.jpg'],
  ['pin', ''],
  ['pin', 'photo\u0000.jpg'],
])(
  'unsafe image reference %s / %s never reaches native filesystem operations',
  async (pin, filename) => {
    expect(() => images.getLocalPath(pin, filename)).toThrow(/unsafe|invalid/i);
    await expect(images.deleteImageByFilename(pin, filename)).rejects.toThrow(/unsafe|invalid/i);
    expect(
      await images.cacheRemoteImage(pin, filename, 'https://storage.example.test/photo')
    ).toBeNull();
    expect(images.fileExistsLocally(pin, filename)).toBe(false);
    expect(mockNativePath).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockDownload).not.toHaveBeenCalled();
  }
);

test('safe reference stays scoped to its pin folder and permits its own deletion', async () => {
  expect(images.getLocalPath('pin-1', 'photo 1.jpg')).toBe(
    'file:///documents/pins/pin-1/photo 1.jpg'
  );
  await images.deleteImageByFilename('pin-1', 'photo 1.jpg');
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('saving a picked image rejects unsafe pin IDs before creating directories', async () => {
  await expect(images.saveImageLocally('../SQLite', 'file:///picker/photo.jpg')).rejects.toThrow();
  expect(mockNativePath).not.toHaveBeenCalled();
});
