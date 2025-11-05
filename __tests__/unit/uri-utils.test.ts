/**
 * URI Utils Unit Tests
 * Tests image URI detection and filename generation
 */

import { isLocalUri, isRemoteUri, generateUniqueFilename } from '~/services/images/utils/uriUtils';

describe('URI Utils', () => {
  describe('isLocalUri', () => {
    test('detects file:// URIs', () => {
      expect(isLocalUri('file:///path/to/image.jpg')).toBe(true);
    });

    test('detects absolute paths', () => {
      expect(isLocalUri('/path/to/image.jpg')).toBe(true);
    });

    test('rejects http:// URIs', () => {
      expect(isLocalUri('http://example.com/image.jpg')).toBe(false);
    });

    test('rejects https:// URIs', () => {
      expect(isLocalUri('https://example.com/image.jpg')).toBe(false);
    });

    test('rejects relative paths', () => {
      expect(isLocalUri('image.jpg')).toBe(false);
    });
  });

  describe('isRemoteUri', () => {
    test('detects http:// URIs', () => {
      expect(isRemoteUri('http://example.com/image.jpg')).toBe(true);
    });

    test('detects https:// URIs', () => {
      expect(isRemoteUri('https://example.com/image.jpg')).toBe(true);
    });

    test('rejects file:// URIs', () => {
      expect(isRemoteUri('file:///path/to/image.jpg')).toBe(false);
    });

    test('rejects absolute paths', () => {
      expect(isRemoteUri('/path/to/image.jpg')).toBe(false);
    });

    test('rejects plain strings', () => {
      expect(isRemoteUri('just-a-string')).toBe(false);
    });
  });

  describe('generateUniqueFilename', () => {
    test('generates filename with .jpg extension', () => {
      const filename = generateUniqueFilename();

      expect(filename).toMatch(/\.jpg$/);
    });

    test('generates unique filenames', () => {
      const filename1 = generateUniqueFilename();
      const filename2 = generateUniqueFilename();

      expect(filename1).not.toBe(filename2);
    });

    test('includes timestamp for uniqueness', () => {
      const filename = generateUniqueFilename();

      // Filename should contain a UUID or timestamp
      expect(filename.length).toBeGreaterThan(10);
    });

    test('generates valid UUID format', () => {
      const filename = generateUniqueFilename();

      // Should be UUID-v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.jpg
      expect(filename).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i
      );
    });
  });
});
