import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SyncStatusBar } from '~/shared/components/SyncStatusBar';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: false }),
}));
jest.mock('../queue/syncQueue', () => ({
  getQueueMetrics: async () => ({ pending: 2, failed: 3, completed: 0 }),
}));

test('screen-reader label includes failed and pending upload status', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <QueryClientProvider client={client}>
          <SyncStatusBar />
        </QueryClientProvider>
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(
      renderer.root.findAllByProps({ accessibilityRole: 'button' })[0].props.accessibilityLabel
    ).toMatch(/3 failed.*2 pending/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    client.clear();
  }
});
