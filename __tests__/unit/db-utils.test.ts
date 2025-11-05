/**
 * Database Utils Unit Tests
 * Tests sanitization and parsing logic
 */

import { sanitizeForDb, sanitizePinForDb, sanitizeFormForDb, parseArrayFields } from '~/db/utils';

describe('Database Utils', () => {
  describe('sanitizeForDb', () => {
    test('removes undefined values', () => {
      const input = { a: 1, b: undefined, c: 'test' };
      const result = sanitizeForDb(input);

      expect(result).toEqual({ a: 1, c: 'test' });
      expect(result.b).toBeUndefined();
    });

    test('converts Date objects to ISO strings', () => {
      const date = new Date('2025-01-01T00:00:00Z');
      const result = sanitizeForDb({ date });

      expect(result.date).toBe('2025-01-01T00:00:00.000Z');
    });

    test('handles nested objects', () => {
      const input = {
        nested: {
          a: undefined,
          b: new Date('2025-01-01'),
          c: 'test',
        },
      };
      const result = sanitizeForDb(input);

      expect(result.nested.a).toBeUndefined();
      expect(result.nested.b).toBe('2025-01-01T00:00:00.000Z');
      expect(result.nested.c).toBe('test');
    });

    test('handles arrays', () => {
      const input = [1, undefined, 'test', new Date('2025-01-01')];
      const result = sanitizeForDb(input);

      expect(result).toEqual([1, null, 'test', '2025-01-01T00:00:00.000Z']);
    });

    test('preserves null values', () => {
      const input = { a: null, b: 'test' };
      const result = sanitizeForDb(input);

      expect(result.a).toBeNull();
    });
  });

  describe('sanitizePinForDb', () => {
    test('converts images array to JSON string', () => {
      const pin = {
        id: 'test-id',
        lat: 11.5,
        lng: 104.9,
        images: ['url1', 'url2'],
      };
      const result = sanitizePinForDb(pin);

      expect(result.images).toBe('["url1","url2"]');
    });

    test('converts localImages array to JSON string', () => {
      const pin = {
        id: 'test-id',
        lat: 11.5,
        lng: 104.9,
        localImages: ['file://path1', 'file://path2'],
      };
      const result = sanitizePinForDb(pin);

      expect(result.localImages).toBe('["file://path1","file://path2"]');
    });

    test('sets default createdAt if missing', () => {
      const pin = {
        id: 'test-id',
        lat: 11.5,
        lng: 104.9,
      };
      const result = sanitizePinForDb(pin);

      expect(result.createdAt).toBeDefined();
      expect(typeof result.createdAt).toBe('string');
    });

    test('converts empty strings to null', () => {
      const pin = {
        id: 'test-id',
        lat: 11.5,
        lng: 104.9,
        name: '',
        address: '',
      };
      const result = sanitizePinForDb(pin);

      expect(result.name).toBeNull();
      expect(result.address).toBeNull();
    });

    test('sets default version to 1', () => {
      const pin = {
        id: 'test-id',
        lat: 11.5,
        lng: 104.9,
      };
      const result = sanitizePinForDb(pin);

      expect(result.version).toBe(1);
    });

    test('handles empty images array', () => {
      const pin = {
        id: 'test-id',
        lat: 11.5,
        lng: 104.9,
        images: [],
      };
      const result = sanitizePinForDb(pin);

      expect(result.images).toBe('[]');
    });
  });

  describe('sanitizeFormForDb', () => {
    test('converts array fields to JSON strings', () => {
      const form = {
        id: 'test-id',
        pinId: 'pin-id',
        cholesterol: ['high', 'normal'],
        diabetes: ['type1'],
      };
      const result = sanitizeFormForDb(form);

      expect(result.cholesterol).toBe('["high","normal"]');
      expect(result.diabetes).toBe('["type1"]');
    });

    test('handles missing array fields', () => {
      const form = {
        id: 'test-id',
        pinId: 'pin-id',
      };
      const result = sanitizeFormForDb(form);

      expect(result.cholesterol).toBe('[]');
      expect(result.diabetes).toBe('[]');
    });

    test('preserves sync status fields', () => {
      const form = {
        id: 'test-id',
        pinId: 'pin-id',
        status: 'synced',
        lastSyncedAt: '2025-01-01T00:00:00Z',
      };
      const result = sanitizeFormForDb(form);

      expect(result.status).toBe('synced');
      expect(result.lastSyncedAt).toBe('2025-01-01T00:00:00Z');
    });
  });

  describe('parseArrayFields', () => {
    test('parses JSON string arrays back to arrays', () => {
      const input = {
        images: '["url1","url2"]',
        tags: '["tag1","tag2"]',
      };
      const result = parseArrayFields(input);

      expect(result.images).toEqual(['url1', 'url2']);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    test('skips non-string values', () => {
      const input = {
        images: ['already', 'array'],
        count: 5,
      };
      const result = parseArrayFields(input);

      expect(result.images).toEqual(['already', 'array']);
      expect(result.count).toBe(5);
    });

    test('handles invalid JSON gracefully', () => {
      const input = {
        images: 'not-valid-json',
      };
      const result = parseArrayFields(input);

      // Should not throw, return as-is or handle gracefully
      expect(result.images).toBeDefined();
    });
  });
});
