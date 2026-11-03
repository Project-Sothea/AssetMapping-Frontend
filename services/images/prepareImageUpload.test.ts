import { Image } from 'react-native';

import { MAX_PHOTO_BYTES, prepareImageUpload } from './prepareImageUpload';

const original = 'file:///pins/p/photo.png';
const mockFiles = new Map<string, number>();
const mockDimensions = jest.fn<Promise<{ width: number; height: number }>, [string]>();
const mockDeleted: string[] = [];
const mockResize = jest.fn();
const mockReleaseImage = jest.fn();
const mockReleaseContext = jest.fn();
const mockSave = jest.fn();
const mockRender = jest.fn();
const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
  SaveFormat: { JPEG: 'jpeg' },
}));
jest.mock('expo-file-system/next', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return mockFiles.get(this.uri) ?? 0;
    }
    delete() {
      mockDeleted.push(this.uri);
      mockFiles.delete(this.uri);
    }
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  mockFiles.clear();
  mockDeleted.length = 0;
  mockFiles.set(original, 4 * MAX_PHOTO_BYTES);
  mockDimensions.mockResolvedValue({ width: 4000, height: 3000 });
  jest.spyOn(Image, 'getSize').mockImplementation((uri) => mockDimensions(uri));
  mockRender.mockResolvedValue({ saveAsync: mockSave, release: mockReleaseImage });
  mockManipulate.mockReturnValue({
    resize: mockResize,
    renderAsync: mockRender,
    release: mockReleaseContext,
  });
  mockSave.mockImplementation(async ({ compress }) => {
    const uri = `file:///cache/${compress}.jpg`;
    mockFiles.set(uri, 100000);
    return { uri, width: 1600, height: 1200 };
  });
});
afterEach(() => jest.restoreAllMocks());

test('large landscape photo gets a bounded JPEG copy; original survives cleanup', async () => {
  const photo = await prepareImageUpload(original, 'image/png');
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(mockSave).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8, base64: false });
  expect(photo).toMatchObject({ uri: 'file:///cache/0.8.jpg', contentType: 'image/jpeg' });
  expect(mockReleaseImage).toHaveBeenCalledTimes(1);
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
  photo.dispose();
  expect(mockDeleted).toEqual(['file:///cache/0.8.jpg']);
  expect(mockFiles.has(original)).toBe(true);
});
test('portrait resizing preserves aspect ratio by specifying only height', async () => {
  mockDimensions.mockResolvedValue({ width: 3000, height: 4000 });
  (await prepareImageUpload(original, 'image/heic')).dispose();
  expect(mockResize).toHaveBeenCalledWith({ height: 1600 });
});
test('small JPEG avoids encoding, enlargement and original deletion', async () => {
  mockFiles.set(original, 100000);
  mockDimensions.mockResolvedValue({ width: 800, height: 600 });
  const photo = await prepareImageUpload(original, 'image/jpeg');
  expect(photo).toMatchObject({ uri: original, contentType: 'image/jpeg' });
  photo.dispose();
  expect(mockManipulate).not.toHaveBeenCalled();
  expect(mockDeleted).toEqual([]);
});
test('oversize encoded output retries quality and removes unused copies', async () => {
  mockSave.mockImplementation(async ({ compress }) => {
    const uri = `file:///cache/${compress}.jpg`;
    mockFiles.set(uri, compress === 0.8 ? MAX_PHOTO_BYTES + 1 : MAX_PHOTO_BYTES);
    return { uri, width: 1600, height: 1200 };
  });
  const photo = await prepareImageUpload(original, 'image/jpeg');
  expect(photo.uri).toBe('file:///cache/0.6.jpg');
  expect(mockDeleted).toEqual(['file:///cache/0.8.jpg']);
  photo.dispose();
  expect(mockFiles.has(original)).toBe(true);
});
test('failed size cap never falls back to uploading the oversized original', async () => {
  mockSave.mockImplementation(async ({ compress }) => {
    const uri = `file:///cache/${compress}.jpg`;
    mockFiles.set(uri, MAX_PHOTO_BYTES + 1);
    return { uri, width: 1600, height: 1200 };
  });
  await expect(prepareImageUpload(original, 'image/jpeg')).rejects.toThrow(/upload limit/);
  expect(mockSave).toHaveBeenCalledTimes(3);
  expect(mockDeleted).toHaveLength(3);
  expect(mockFiles.has(original)).toBe(true);
});
test('native render failure releases resources and retains the original', async () => {
  mockRender.mockRejectedValueOnce(new Error('Native failure'));
  await expect(prepareImageUpload(original, 'image/jpeg')).rejects.toThrow('Native failure');
  expect(mockReleaseContext).toHaveBeenCalledTimes(1);
  expect(mockDeleted).toEqual([]);
});
test('encoder cannot overwrite or clean up the original', async () => {
  mockSave.mockResolvedValueOnce({ uri: original, width: 1600, height: 1200 });
  await expect(prepareImageUpload(original, 'image/jpeg')).rejects.toThrow(/separate upload/);
  expect(mockDeleted).toEqual([]);
});
test('oversized animation is rejected without flattening it', async () => {
  await expect(prepareImageUpload(original, 'image/gif')).rejects.toThrow(/2 MiB/);
  expect(mockManipulate).not.toHaveBeenCalled();
  expect(mockDeleted).toEqual([]);
});
test.each([0, Infinity])('invalid width %s cannot produce an upload', async (width) => {
  mockDimensions.mockResolvedValue({ width, height: 3000 });
  await expect(prepareImageUpload(original, 'image/jpeg')).rejects.toThrow(/dimensions/);
  expect(mockManipulate).not.toHaveBeenCalled();
});

test('small photo with a legacy non-JPEG key gets actual JPEG MIME on reupload', async () => {
  mockFiles.set(original, 100000);
  mockDimensions.mockResolvedValue({ width: 800, height: 600 });
  mockSave.mockImplementationOnce(async () => {
    mockFiles.set('file:///cache/new.jpg', 90000);
    return { uri: 'file:///cache/new.jpg', width: 800, height: 600 };
  });
  const photo = await prepareImageUpload(original, 'image/heic');
  expect(photo.contentType).toBe('image/jpeg');
  expect(mockResize).not.toHaveBeenCalled();
  photo.dispose();
  expect(mockFiles.has(original)).toBe(true);
});
