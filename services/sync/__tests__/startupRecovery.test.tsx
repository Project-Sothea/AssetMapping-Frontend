import React from 'react';
import { ActivityIndicator, Button } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import RootLayout from '~/app/_layout';
import { useInitialSync } from '~/hooks/RealTimeSync/useInitialSync';

let mockAttempts: { success: boolean; error?: Error }[];
let mockRuns = 0;
jest.mock('~/services/drizzleDb', () => ({
  useRunMigrations: () => {
    const [result] = require('react').useState(() => {
      mockRuns++;
      return mockAttempts.shift();
    });
    return result;
  },
}));
jest.mock('expo-router', () => ({
  Stack: Object.assign(() => require('react').createElement('View', { testID: 'navigation' }), {
    Screen: () => null,
  }),
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('~/providers/QueryProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('~/shared/contexts/PopupContext', () => ({
  PopupProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('~/hooks/RealTimeSync/useInitialSync', () => ({
  useInitialSync: jest.fn(() => ({ isLoading: false })),
}));
jest.mock('~/hooks/RealTimeSync/useRealTimeSync', () => ({ useRealTimeSync: jest.fn() }));
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ setupReady: true, kind: null }),
}));

let renderer: ReactTestRenderer;
beforeEach(() => {
  mockRuns = 0;
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});

test('migration error exposes retry and does not mount setup or editors until retry succeeds', async () => {
  mockAttempts = [{ success: false, error: new Error('Migration failed') }, { success: true }];
  await act(async () => {
    renderer = create(<RootLayout />);
  });
  expect(renderer.root.findAllByProps({ testID: 'navigation' })).toHaveLength(0);
  expect(useInitialSync).not.toHaveBeenCalled();
  const retry = renderer.root.findByType(Button);
  expect(retry.props.title).toMatch(/retry/i);
  await act(async () => {
    retry.props.onPress();
  });
  expect(mockRuns).toBe(2);
  expect(renderer.root.findAllByProps({ testID: 'navigation' })).toHaveLength(1);
  expect(useInitialSync).toHaveBeenCalled();
});

test('repeated migration failure stays recoverable without opening normal screens', async () => {
  mockAttempts = [
    { success: false, error: new Error('First') },
    { success: false, error: new Error('Second') },
  ];
  await act(async () => {
    renderer = create(<RootLayout />);
  });
  await act(async () => {
    renderer.root.findByType(Button).props.onPress();
  });
  expect(mockRuns).toBe(2);
  expect(renderer.root.findByType(Button).props.title).toMatch(/retry/i);
  expect(renderer.root.findAllByProps({ testID: 'navigation' })).toHaveLength(0);
  expect(useInitialSync).not.toHaveBeenCalled();
});

test('migration loading shows progress without mounting editors', async () => {
  mockAttempts = [{ success: false }];
  await act(async () => {
    renderer = create(<RootLayout />);
  });
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  expect(renderer.root.findAllByProps({ testID: 'navigation' })).toHaveLength(0);
});
