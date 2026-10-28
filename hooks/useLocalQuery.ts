import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef, useState, type DependencyList } from 'react';

import { stableRows } from '~/shared/utils/stableRows';
import { createTableChangeBatcher } from '~/shared/utils/tableChanges';

const changes = createTableChangeBatcher((flush) => setTimeout(flush, 16));
let nativeListener: ReturnType<typeof addDatabaseChangeListener> | undefined;
let subscriberCount = 0;

function subscribe(table: string, refresh: () => void) {
  if (!nativeListener)
    nativeListener = addDatabaseChangeListener(({ tableName }) => changes.changed(tableName));
  subscriberCount++;
  const unsubscribe = changes.subscribe(table, refresh);
  return () => {
    unsubscribe();
    if (--subscriberCount === 0) {
      nativeListener?.remove();
      nativeListener = undefined;
    }
  };
}

export function subscribeToLocalTables(tables: readonly string[], refresh: () => void) {
  const unsubscribe = tables.map((table) => subscribe(table, refresh));
  return () => unsubscribe.forEach((remove) => remove());
}

// Expo's synchronous SQLite driver runs queries on the JS thread. Refresh once per
// burst of table changes instead of once per changed row, and release subscriptions on unmount.
export function useLocalQuery<T>(query: { all(): T[] }, table: string, deps: DependencyList = []) {
  const latestQuery = useRef(query);
  latestQuery.current = query;
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState<unknown>();
  useEffect(() => {
    const refresh = () => {
      try {
        const next = latestQuery.current.all();
        setData((previous) => stableRows(previous, next));
        setError(undefined);
      } catch (err) {
        setError(err);
      }
    };
    const unsubscribe = subscribe(table, refresh);
    refresh();
    return unsubscribe;
    // Query scope (e.g. pinId) is supplied explicitly, matching the live-query API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, ...deps]);
  return { data, error };
}
