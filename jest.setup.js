/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('uuid', () => ({ v4: () => require('crypto').randomUUID() }));
// Expo's native fetch module is unavailable in Jest's Node runtime.
jest.mock('expo/fetch', () => ({ fetch: (...args) => global.fetch(...args) }));
