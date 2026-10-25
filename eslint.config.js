// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const reactNativePlugin = require('eslint-plugin-react-native');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['services/sync/__tests__/**/*.{ts,tsx}'],
    // Jest factories and fresh-app tests require modules after installing mocks.
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    plugins: {
      'react-native': reactNativePlugin,
    },
    rules: {
      'react-native/no-unused-styles': 'error',
    },
  },
  {
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
          pathGroups: [{ pattern: '~/**', group: 'internal', position: 'after' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
    },
    settings: {
      'import/resolver': { typescript: true, node: true },
    },
  },
]);
