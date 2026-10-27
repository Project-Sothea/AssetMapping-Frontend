import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { DataTransferControls } from '~/features/sync/components/DataTransferControls';
import { subscribeToLocalTables } from '~/hooks/useLocalQuery';

import { clearLocalData, downloadLatest, getLocalDataSummary } from '../localDataTransfer';
import { uploadPendingChanges } from '../queue/syncQueue';

jest.mock('../localDataTransfer', () => ({
  getLocalDataSummary: jest.fn(),
  clearLocalData: jest.fn(),
  downloadLatest: jest.fn(),
}));
jest.mock('../queue/syncQueue', () => ({ uploadPendingChanges: jest.fn() }));
jest.mock('~/hooks/useLocalQuery', () => ({ subscribeToLocalTables: jest.fn(() => jest.fn()) }));
let mockBusy = false;
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: mockBusy, setupReady: true, kind: null }),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
let renderer: ReactTestRenderer;
let client: QueryClient;

beforeEach(() => {
  mockBusy = false;
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest
    .mocked(getLocalDataSummary)
    .mockResolvedValue({ pins: 2, forms: 1, pending: 3, failed: 0, unsynced: 3 });
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  client.clear();
});
async function mount() {
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={client}>
        <DataTransferControls />
      </QueryClientProvider>
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
const button = (label: string) => renderer.root.findAllByProps({ accessibilityLabel: label })[0];
const text = () =>
  renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .join(' ');

test('download and clearing are disabled while local unsent work exists', async () => {
  await mount();
  expect(button('Download latest data').props.disabled).toBe(true);
  expect(button('Clear local data').props.disabled).toBe(true);
  expect(text()).toContain('3 pending');
  expect(text()).not.toContain('but there are no pending uploads');
});

test.each([1, 3])(
  '%s locally unconfirmed records without queued work show a warning and cannot be cleared',
  async (unsynced) => {
    jest
      .mocked(getLocalDataSummary)
      .mockResolvedValue({ pins: 2, forms: 1, pending: 0, failed: 0, unsynced });
    await mount();
    expect(text()).toContain(
      `${unsynced} locally saved ${unsynced === 1 ? 'record is' : 'records are'} not confirmed uploaded`
    );
    expect(text()).toContain('but there are no pending uploads');
    expect(text()).toContain('Keep this data on the device and contact the app team.');
    expect(button('Upload changes').props.disabled).toBe(true);
    expect(button('Clear local data').props.disabled).toBe(true);
    expect(button('Download latest data').props.disabled).toBe(true);
    expect(uploadPendingChanges).not.toHaveBeenCalled();
    expect(clearLocalData).not.toHaveBeenCalled();
    expect(downloadLatest).not.toHaveBeenCalled();
  }
);

test('failed queued uploads do not show the missing-queue warning', async () => {
  jest
    .mocked(getLocalDataSummary)
    .mockResolvedValue({ pins: 2, forms: 1, pending: 0, failed: 1, unsynced: 3 });
  await mount();
  expect(text()).not.toContain('but there are no pending uploads');
  expect(button('Upload changes').props.disabled).toBe(false);
});

test('transfer text has an opaque light surface over the dark Download background', async () => {
  await mount();
  const section = renderer.root.findByType(DataTransferControls).findAllByType(View)[0];
  expect(StyleSheet.flatten(section.props.style).backgroundColor).toBe('#fff');
});

test('partial upload reports failures instead of claiming all uploaded', async () => {
  jest.mocked(uploadPendingChanges).mockResolvedValue({
    uploaded: 2,
    failed: 1,
    blocked: 0,
    remaining: 1,
    errors: [{ entityId: 'p', entityType: 'pin', name: 'A1', message: 'Offline' }],
  });
  await mount();
  await act(async () => {
    await button('Upload changes').props.onPress();
  });
  expect(text()).toContain('2 uploaded');
  expect(text()).toContain('1 failed');
  expect(text()).toContain('A1');
  expect(text()).toContain('Offline');
});

test('double tapping upload cannot start two sessions', async () => {
  let release!: (value: unknown) => void;
  jest.mocked(uploadPendingChanges).mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve as typeof release;
      })
  );
  await mount();
  let pending!: Promise<void>;
  await act(async () => {
    const press = button('Upload changes').props.onPress;
    pending = press();
    await press();
  });
  expect(uploadPendingChanges).toHaveBeenCalledTimes(1);
  await act(async () => {
    release({ uploaded: 3, failed: 0, blocked: 0, remaining: 0, errors: [] });
    await pending;
  });
});

test('clearing requires a separate confirmation and cancellation leaves data untouched', async () => {
  jest
    .mocked(getLocalDataSummary)
    .mockResolvedValue({ pins: 2, forms: 1, pending: 0, failed: 0, unsynced: 0 });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount();
  await act(async () => {
    button('Clear local data').props.onPress();
  });
  expect(clearLocalData).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][2]?.some((action) => action.style === 'cancel')).toBe(true);
  jest.mocked(clearLocalData).mockResolvedValue({ cleanupWarnings: [] });
  await act(async () => {
    await alert.mock.calls[0][2]?.find((action) => action.style === 'destructive')?.onPress?.();
  });
  expect(clearLocalData).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});

test('only an empty device enables manual download', async () => {
  jest
    .mocked(getLocalDataSummary)
    .mockResolvedValue({ pins: 0, forms: 0, pending: 0, failed: 0, unsynced: 0 });
  jest.mocked(downloadLatest).mockResolvedValue({ pins: 10, forms: 5 });
  await mount();
  expect(button('Download latest data').props.disabled).toBe(false);
  await act(async () => {
    await button('Download latest data').props.onPress();
  });
  expect(downloadLatest).toHaveBeenCalledTimes(1);
  expect(text()).toContain('10 pins');
});

test('mounted controls disable all transfer commands when another tab starts a transfer', async () => {
  await mount();
  mockBusy = true;
  await act(async () => {
    renderer.update(
      <QueryClientProvider client={client}>
        <DataTransferControls />
      </QueryClientProvider>
    );
  });
  expect(button('Upload changes').props.disabled).toBe(true);
  expect(button('Download latest data').props.disabled).toBe(true);
  expect(button('Clear local data').props.disabled).toBe(true);
  await act(async () => {
    await button('Upload changes').props.onPress();
  });
  expect(uploadPendingChanges).not.toHaveBeenCalled();
});

test('local table changes refresh the summary without polling', async () => {
  await mount();
  const calls = jest.mocked(subscribeToLocalTables).mock.calls;
  expect(calls[0][0]).toEqual(['pins', 'forms', 'sync_queue', 'sync_inflight']);
  expect('refetchInterval' in client.getQueryCache().getAll()[0].options).toBe(false);
  jest
    .mocked(getLocalDataSummary)
    .mockResolvedValue({ pins: 3, forms: 2, pending: 0, failed: 0, unsynced: 0 });
  await act(async () => {
    calls[0][1]();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(text()).toContain('3 pins / 2 forms');
  expect(button('Clear local data').props.disabled).toBe(false);
});

test('unmounting releases the local table subscription', async () => {
  const unsubscribe = jest.fn();
  jest.mocked(subscribeToLocalTables).mockReturnValueOnce(unsubscribe);
  await mount();
  await act(async () => renderer.unmount());
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
