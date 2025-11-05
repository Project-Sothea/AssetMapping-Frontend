/**
 * Image Storage Integration Tests
 * Tests file operations for saving and deleting images
 */

import { saveNewImages, deleteImages } from '~/services/images/imageStorage/ImageStorage';
import * as fileSystemUtils from '~/services/images/imageStorage/fileSystemsUtils';
import * as directoryUtils from '~/services/images/imageStorage/directoryUtils';

// Mock filesystem operations
jest.mock('~/services/images/imageStorage/fileSystemsUtils');
jest.mock('~/services/images/imageStorage/directoryUtils');

const mockCopyFile = fileSystemUtils.copyFile as jest.MockedFunction<
  typeof fileSystemUtils.copyFile
>;
const mockDownloadFile = fileSystemUtils.downloadFile as jest.MockedFunction<
  typeof fileSystemUtils.downloadFile
>;
const mockDeleteFile = fileSystemUtils.deleteFile as jest.MockedFunction<
  typeof fileSystemUtils.deleteFile
>;
const mockGetPinDirectoryPath = directoryUtils.getPinDirectoryPath as jest.MockedFunction<
  typeof directoryUtils.getPinDirectoryPath
>;

describe('Image Storage Integration', () => {
  const pinId = 'test-pin-123';
  const pinDirectory = 'file:///storage/pins/test-pin-123/';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPinDirectoryPath.mockResolvedValue(pinDirectory);
  });

  describe('saveNewImages', () => {
    test('copies local images to pin directory', async () => {
      mockCopyFile.mockResolvedValue();
      const localUris = ['file:///temp/photo1.jpg', 'file:///temp/photo2.jpg'];

      const result = await saveNewImages(pinId, localUris);

      expect(mockCopyFile).toHaveBeenCalledTimes(2);
      expect(result.success.length).toBe(2);
      expect(result.fail.length).toBe(0);

      // Verify URIs start with pin directory
      result.success.forEach((uri) => {
        expect(uri).toContain(pinDirectory);
      });
    });

    test('downloads remote images to pin directory', async () => {
      mockDownloadFile.mockResolvedValue();
      const remoteUris = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];

      const result = await saveNewImages(pinId, remoteUris);

      expect(mockDownloadFile).toHaveBeenCalledTimes(2);
      expect(result.success.length).toBe(2);
      expect(result.fail.length).toBe(0);
    });

    test('generates unique filenames for each image', async () => {
      mockCopyFile.mockResolvedValue();
      const localUris = ['file:///temp/photo1.jpg', 'file:///temp/photo2.jpg'];

      const result = await saveNewImages(pinId, localUris);

      // All success URIs should be unique
      const uniqueUris = new Set(result.success);
      expect(uniqueUris.size).toBe(result.success.length);
    });

    test('returns fail list when image save fails', async () => {
      mockCopyFile
        .mockResolvedValueOnce() // First succeeds
        .mockRejectedValueOnce(new Error('Copy failed')); // Second fails

      const localUris = ['file:///temp/photo1.jpg', 'file:///temp/photo2.jpg'];

      const result = await saveNewImages(pinId, localUris);

      expect(result.success.length).toBe(1);
      expect(result.fail.length).toBe(1);
      expect(result.fail[0]).toBe('file:///temp/photo2.jpg');
    });

    test('continues processing if one image fails', async () => {
      mockCopyFile
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce() // Second succeeds
        .mockResolvedValueOnce(); // Third succeeds

      const localUris = [
        'file:///temp/photo1.jpg',
        'file:///temp/photo2.jpg',
        'file:///temp/photo3.jpg',
      ];

      const result = await saveNewImages(pinId, localUris);

      expect(result.success.length).toBe(2);
      expect(result.fail.length).toBe(1);
    });

    test('handles empty array', async () => {
      const result = await saveNewImages(pinId, []);

      expect(result.success.length).toBe(0);
      expect(result.fail.length).toBe(0);
      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(mockDownloadFile).not.toHaveBeenCalled();
    });
  });

  describe('deleteImages', () => {
    test('deletes files from filesystem', async () => {
      mockDeleteFile.mockResolvedValue();
      const filenames = [
        'file:///storage/pins/test/image1.jpg',
        'file:///storage/pins/test/image2.jpg',
      ];

      const result = await deleteImages(filenames);

      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
      expect(result.success.length).toBe(2);
      expect(result.fail.length).toBe(0);
    });

    test('returns fail list when delete fails', async () => {
      mockDeleteFile
        .mockResolvedValueOnce() // First succeeds
        .mockRejectedValueOnce(new Error('Delete failed')); // Second fails

      const filenames = [
        'file:///storage/pins/test/image1.jpg',
        'file:///storage/pins/test/image2.jpg',
      ];

      const result = await deleteImages(filenames);

      expect(result.success.length).toBe(1);
      expect(result.fail.length).toBe(1);
    });

    test('handles non-existent files gracefully', async () => {
      mockDeleteFile.mockRejectedValue(new Error('File not found'));

      const filenames = ['file:///storage/pins/test/nonexistent.jpg'];

      const result = await deleteImages(filenames);

      expect(result.success.length).toBe(0);
      expect(result.fail.length).toBe(1);
    });

    test('handles empty array', async () => {
      const result = await deleteImages([]);

      expect(result.success.length).toBe(0);
      expect(result.fail.length).toBe(0);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });
  });
});
