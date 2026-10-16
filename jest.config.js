module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: { '^~/(.*)$': '<rootDir>/$1' },
  transformIgnorePatterns: [
    '/node_modules/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|uuid))',
  ],
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.superpowers/'],
};
