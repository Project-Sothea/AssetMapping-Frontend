/* global jest */
// Jest setup file
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-crypto
jest.mock('expo-crypto', () => {
  const crypto = require('crypto');
  return {
    digestStringAsync: jest.fn(async (algorithm, data) => {
      // Return a proper SHA-256 hash for testing
      return crypto.createHash('sha256').update(data).digest('hex');
    }),
    CryptoDigestAlgorithm: {
      SHA256: 'SHA256',
    },
  };
});

// Mock expo-sqlite
jest.mock('expo-sqlite', () => {
  const mockDB = {
    execSync: jest.fn(() => ({ changes: 0, lastInsertRowId: 0 })),
    runSync: jest.fn(() => ({ changes: 1, lastInsertRowId: 1 })),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(() => ({ changes: 1, lastInsertRowId: 1 })),
      executeForRawResultSync: jest.fn(() => ({
        rows: [],
        changes: 0,
        lastInsertRowId: 0,
      })),
      finalizeSync: jest.fn(),
    })),
  };

  return {
    openDatabaseSync: jest.fn(() => mockDB),
  };
});

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
