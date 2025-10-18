/**
 * Tests for Queue Utility Functions
 *
 * Tests:
 * - Device identification
 * - Idempotency key generation
 * - Backoff calculations
 * - Validation
 * - Error detection
 * - Timestamp utilities
 */

import {
  getDeviceId,
  resetDeviceId,
  generateIdempotencyKey,
  areIdempotencyKeysEqual,
  calculateBackoffDelay,
  shouldRetry,
  getCurrentTimestamp,
  isTimestampRecent,
  getTimestampAge,
  validateOperationInput,
  getNextSequenceNumber,
  resetSequenceCounter,
  formatOperation,
  formatDuration,
  isNetworkError,
  isConflictError,
  getUserFriendlyError,
} from '../utils';

describe('Device Identification', () => {
  beforeEach(() => {
    resetDeviceId();
  });

  test('getDeviceId returns consistent ID', async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();

    expect(id1).toBe(id2); // Should be cached
    expect(id1).toHaveLength(16); // Shortened hash
  });

  test('getDeviceId is reset correctly', async () => {
    const id1 = await getDeviceId();
    resetDeviceId();
    const id2 = await getDeviceId();

    // IDs might differ if session changes, but should both be valid
    expect(id1).toHaveLength(16);
    expect(id2).toHaveLength(16);
  });
});

describe('Idempotency', () => {
  test('generateIdempotencyKey produces deterministic hashes', async () => {
    const components = {
      operation: 'create' as const,
      entityType: 'pin' as const,
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
      deviceId: 'device-abc',
    };

    const key1 = await generateIdempotencyKey(components);
    const key2 = await generateIdempotencyKey(components);

    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64); // SHA-256 hex string
  });

  test('different inputs produce different keys', async () => {
    const base = {
      operation: 'create' as const,
      entityType: 'pin' as const,
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
      deviceId: 'device-abc',
    };

    const key1 = await generateIdempotencyKey(base);
    const key2 = await generateIdempotencyKey({ ...base, entityId: 'test-456' });

    expect(key1).not.toBe(key2);
  });

  test('areIdempotencyKeysEqual compares correctly', () => {
    const key1 = 'abc123';
    const key2 = 'abc123';
    const key3 = 'def456';

    expect(areIdempotencyKeysEqual(key1, key2)).toBe(true);
    expect(areIdempotencyKeysEqual(key1, key3)).toBe(false);
  });
});

describe('Retry Logic', () => {
  test('calculateBackoffDelay returns increasing delays', () => {
    const delay0 = calculateBackoffDelay(0);
    const delay1 = calculateBackoffDelay(1);
    const delay2 = calculateBackoffDelay(2);

    // Should be approximately: 1s, 2s, 4s (with jitter)
    expect(delay0).toBeGreaterThanOrEqual(800); // 1s ±20%
    expect(delay0).toBeLessThanOrEqual(1200);

    expect(delay1).toBeGreaterThanOrEqual(1600); // 2s ±20%
    expect(delay1).toBeLessThanOrEqual(2400);

    expect(delay2).toBeGreaterThanOrEqual(3200); // 4s ±20%
    expect(delay2).toBeLessThanOrEqual(4800);
  });

  test('calculateBackoffDelay handles large attempt numbers', () => {
    const delay10 = calculateBackoffDelay(10);

    // Should use exponential: 2^10 * 1000 = 1024000ms
    expect(delay10).toBeGreaterThan(800000); // With jitter
    expect(delay10).toBeLessThan(1300000);
  });

  test('shouldRetry returns correct values', () => {
    expect(shouldRetry(0, 3)).toBe(true);
    expect(shouldRetry(1, 3)).toBe(true);
    expect(shouldRetry(2, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
    expect(shouldRetry(4, 3)).toBe(false);
  });
});

describe('Validation', () => {
  test('validateOperationInput accepts valid input', () => {
    const input = {
      operation: 'create',
      entityType: 'pin',
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { name: 'Test' },
    };

    expect(validateOperationInput(input)).toBeNull();
  });

  test('validateOperationInput rejects missing operation', () => {
    const input = {
      entityType: 'pin',
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { name: 'Test' },
    };

    const error = validateOperationInput(input);
    expect(error).toContain('Operation type is required');
  });

  test('validateOperationInput rejects invalid operation type', () => {
    const input = {
      operation: 'invalid',
      entityType: 'pin',
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { name: 'Test' },
    };

    const error = validateOperationInput(input);
    expect(error).toContain('Invalid operation type');
  });

  test('validateOperationInput rejects invalid entity type', () => {
    const input = {
      operation: 'create',
      entityType: 'invalid',
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
      data: { name: 'Test' },
    };

    const error = validateOperationInput(input);
    expect(error).toContain('Invalid entity type');
  });

  test('validateOperationInput rejects missing data', () => {
    const input = {
      operation: 'create',
      entityType: 'pin',
      entityId: 'test-123',
      timestamp: '2025-01-01T00:00:00.000Z',
    };

    const error = validateOperationInput(input);
    expect(error).toContain('Data payload is required');
  });
});

describe('Sequence Numbers', () => {
  beforeEach(() => {
    resetSequenceCounter();
  });

  test('getNextSequenceNumber returns increasing values', () => {
    const seq1 = getNextSequenceNumber();
    const seq2 = getNextSequenceNumber();
    const seq3 = getNextSequenceNumber();

    expect(seq2).toBeGreaterThan(seq1);
    expect(seq3).toBeGreaterThan(seq2);
  });

  test('sequence numbers are unique', () => {
    const sequences = new Set();
    for (let i = 0; i < 100; i++) {
      sequences.add(getNextSequenceNumber());
    }
    expect(sequences.size).toBe(100); // All unique
  });

  test('resetSequenceCounter works', () => {
    getNextSequenceNumber();
    getNextSequenceNumber();
    resetSequenceCounter();

    const seq = getNextSequenceNumber();
    // After reset, counter starts at 0 again
    expect(seq % 1000).toBe(0);
  });
});

describe('Timestamp Utilities', () => {
  test('getCurrentTimestamp returns ISO string', () => {
    const ts = getCurrentTimestamp();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(() => new Date(ts)).not.toThrow();
  });

  test('isTimestampRecent detects recent timestamps', () => {
    const now = getCurrentTimestamp();
    const old = new Date(Date.now() - 10000).toISOString(); // 10s ago

    expect(isTimestampRecent(now, 5000)).toBe(true); // Within 5s
    expect(isTimestampRecent(old, 5000)).toBe(false); // Not within 5s
    expect(isTimestampRecent(old, 15000)).toBe(true); // Within 15s
  });

  test('getTimestampAge returns correct age', () => {
    const old = new Date(Date.now() - 5000).toISOString(); // 5s ago
    const age = getTimestampAge(old);

    expect(age).toBeGreaterThanOrEqual(4900);
    expect(age).toBeLessThanOrEqual(5100); // Allow small time drift
  });
});

describe('Formatting', () => {
  test('formatOperation formats correctly', () => {
    const op = {
      operation: 'create',
      entityType: 'pin',
      entityId: 'abcdef1234567890',
    };

    const formatted = formatOperation(op);
    expect(formatted).toBe('CREATE pin:abcdef12');
  });

  test('formatDuration formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(65000)).toBe('1.1m');
    expect(formatDuration(7200000)).toBe('2.0h');
  });
});

describe('Error Detection', () => {
  test('isNetworkError detects network errors', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
    expect(isNetworkError(new Error('ECONNREFUSED'))).toBe(true);
    expect(isNetworkError(new Error('timeout occurred'))).toBe(true);
    expect(isNetworkError(new Error('Invalid data'))).toBe(false);
  });

  test('isConflictError detects conflicts', () => {
    expect(isConflictError(new Error('409 Conflict'))).toBe(true);
    expect(isConflictError(new Error('Resource conflict'))).toBe(true);
    expect(isConflictError(new Error('Network error'))).toBe(false);
  });

  test('getUserFriendlyError returns appropriate messages', () => {
    const networkErr = new Error('Network request failed');
    const conflictErr = new Error('409 Conflict');
    const genericErr = new Error('Something went wrong');

    expect(getUserFriendlyError(networkErr)).toContain('Network connection');
    expect(getUserFriendlyError(conflictErr)).toContain('modified elsewhere');
    expect(getUserFriendlyError(genericErr)).toContain('Sync failed');
  });
});
