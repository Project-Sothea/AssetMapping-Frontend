import { addDatabaseChangeListener, type DatabaseChangeEvent } from 'expo-sqlite';
import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { subscribeToLocalTables, useLocalQuery } from '~/hooks/useLocalQuery';

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));

type Row = { id: string; value: string };
type Query = { all: jest.Mock<Row[], []> };
const listeners = new Set<(event: DatabaseChangeEvent) => void>();
const nativeRemovals: jest.Mock[] = [];
const unsubscribeCallbacks: (() => void)[] = [];
let renderer: ReactTestRenderer | undefined;

function emit(tableName: string) {
  listeners.forEach((listener) =>
    listener({
      databaseName: 'main',
      databaseFilePath: '/synthetic/local.db',
      tableName,
      rowId: 1,
    })
  );
}

function Rows({ query, scope = 'one' }: { query: Query; scope?: string }) {
  const { data, error } = useLocalQuery(query, 'forms', [scope]);
  return <Text>{error ? 'Query failed' : data.map((row) => row.value).join(',')}</Text>;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  listeners.clear();
  nativeRemovals.length = 0;
  jest.mocked(addDatabaseChangeListener).mockImplementation((listener) => {
    listeners.add(listener);
    const remove = jest.fn(() => listeners.delete(listener));
    nativeRemovals.push(remove);
    return { remove };
  });
});

afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  unsubscribeCallbacks.splice(0).forEach((unsubscribe) => unsubscribe());
  await act(async () => jest.runOnlyPendingTimers());
  expect(listeners.size).toBe(0);
  jest.useRealTimers();
});

test('real query hook refreshes once per native table-change burst and ignores unrelated tables', async () => {
  const query: Query = { all: jest.fn(() => [{ id: 'form-1', value: 'Saved locally' }]) };
  await act(async () => {
    renderer = create(<Rows query={query} />);
  });
  expect(addDatabaseChangeListener).toHaveBeenCalledTimes(1);
  expect(query.all).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByType(Text).props.children).toBe('Saved locally');
  query.all.mockReturnValue([{ id: 'form-1', value: 'Uploaded' }]);
  await act(async () => {
    emit('pins');
    jest.advanceTimersByTime(16);
  });
  expect(query.all).toHaveBeenCalledTimes(1);
  await act(async () => {
    for (let index = 0; index < 100; index++) emit('forms');
    jest.advanceTimersByTime(15);
  });
  expect(query.all).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(1));
  expect(query.all).toHaveBeenCalledTimes(2);
  expect(renderer!.root.findByType(Text).props.children).toBe('Uploaded');
});

test('queries and multi-table subscribers share one native listener and deduplicate cross-table refreshes', async () => {
  const query: Query = { all: jest.fn(() => [{ id: 'form-1', value: 'Local' }]) };
  const summaryRefresh = jest.fn();
  const unrelatedRefresh = jest.fn();
  await act(async () => {
    renderer = create(<Rows query={query} />);
  });
  unsubscribeCallbacks.push(
    subscribeToLocalTables(['pins', 'forms', 'sync_queue', 'sync_inflight'], summaryRefresh),
    subscribeToLocalTables(['other_table'], unrelatedRefresh)
  );
  expect(addDatabaseChangeListener).toHaveBeenCalledTimes(1);
  await act(async () => {
    emit('pins');
    emit('forms');
    emit('sync_queue');
    emit('sync_inflight');
    emit('forms');
    jest.advanceTimersByTime(16);
  });
  expect(query.all).toHaveBeenCalledTimes(2);
  expect(summaryRefresh).toHaveBeenCalledTimes(1);
  expect(unrelatedRefresh).not.toHaveBeenCalled();
  await act(async () => renderer!.unmount());
  renderer = undefined;
  expect(nativeRemovals[0]).not.toHaveBeenCalled();
  unsubscribeCallbacks.splice(0).forEach((unsubscribe) => unsubscribe());
  expect(nativeRemovals[0]).toHaveBeenCalledTimes(1);
  expect(listeners.size).toBe(0);
});

test('unmount cancels a queued refresh and the next mount registers a fresh native listener', async () => {
  const oldQuery: Query = { all: jest.fn(() => [{ id: 'old', value: 'Old' }]) };
  await act(async () => {
    renderer = create(<Rows query={oldQuery} />);
  });
  emit('forms');
  await act(async () => renderer!.unmount());
  renderer = undefined;
  await act(async () => jest.advanceTimersByTime(16));
  expect(oldQuery.all).toHaveBeenCalledTimes(1);
  expect(nativeRemovals[0]).toHaveBeenCalledTimes(1);
  const nextQuery: Query = { all: jest.fn(() => [{ id: 'new', value: 'New' }]) };
  await act(async () => {
    renderer = create(<Rows query={nextQuery} />);
  });
  expect(addDatabaseChangeListener).toHaveBeenCalledTimes(2);
  await act(async () => {
    emit('forms');
    jest.advanceTimersByTime(16);
  });
  expect(nextQuery.all).toHaveBeenCalledTimes(2);
  expect(oldQuery.all).toHaveBeenCalledTimes(1);
});

test('scope changes query immediately and later notifications use the latest query object', async () => {
  const firstQuery: Query = { all: jest.fn(() => [{ id: 'first', value: 'First household' }]) };
  const secondQuery: Query = { all: jest.fn(() => [{ id: 'second', value: 'Second household' }]) };
  await act(async () => {
    renderer = create(<Rows query={firstQuery} scope="first" />);
  });
  await act(async () => renderer!.update(<Rows query={secondQuery} scope="second" />));
  expect(secondQuery.all).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByType(Text).props.children).toBe('Second household');
  const replacement: Query = { all: jest.fn(() => [{ id: 'second', value: 'Updated answer' }]) };
  await act(async () => renderer!.update(<Rows query={replacement} scope="second" />));
  expect(replacement.all).not.toHaveBeenCalled();
  await act(async () => {
    emit('forms');
    jest.advanceTimersByTime(16);
  });
  expect(replacement.all).toHaveBeenCalledTimes(1);
  expect(firstQuery.all).toHaveBeenCalledTimes(1);
  expect(secondQuery.all).toHaveBeenCalledTimes(1);
  expect(renderer!.root.findByType(Text).props.children).toBe('Updated answer');
});

test('a native-triggered query failure is recoverable on the next change', async () => {
  const query: Query = { all: jest.fn(() => [{ id: 'form-1', value: 'Stored answer' }]) };
  await act(async () => {
    renderer = create(<Rows query={query} />);
  });
  query.all.mockImplementationOnce(() => {
    throw new Error('Synthetic SQLite failure');
  });
  await act(async () => {
    emit('forms');
    jest.advanceTimersByTime(16);
  });
  expect(renderer!.root.findByType(Text).props.children).toBe('Query failed');
  await act(async () => {
    emit('forms');
    jest.advanceTimersByTime(16);
  });
  expect(renderer!.root.findByType(Text).props.children).toBe('Stored answer');
});
