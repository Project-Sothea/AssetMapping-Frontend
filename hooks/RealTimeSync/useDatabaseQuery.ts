import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

import { getTransferState, subscribeTransferState } from '~/services/sync/transferCoordinator';

/** Coalesce the database reads themselves, and never read an import mid-transfer. */
export function useDatabaseQuery<T>(read: () => T[], tables: string[], scope = '') {
  const readRef = useRef(read);
  readRef.current = read;
  const [snapshot, setSnapshot] = useState<{ scope: string; tableKey: string; data: T[] }>({
    scope,
    tableKey: tables.join('|'),
    data: [],
  });
  const [error, setError] = useState<Error>();
  const tableKey = tables.join('|');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let dirty = true;
    const refresh = () => {
      timer = undefined;
      if (disposed || getTransferState().kind) return;
      dirty = false;
      try {
        setSnapshot({ scope, tableKey, data: readRef.current() });
        setError(undefined);
      } catch (failure) {
        setError(failure instanceof Error ? failure : new Error(String(failure)));
      }
    };
    const schedule = () => {
      dirty = true;
      clearTimeout(timer);
      if (!getTransferState().kind) timer = setTimeout(refresh, 40);
    };
    const listener = addDatabaseChangeListener(({ tableName, databaseFilePath }) => {
      if (databaseFilePath && !databaseFilePath.endsWith('/local.db')) return;
      if (tableKey.split('|').includes(tableName)) schedule();
    });
    const unsubscribe = subscribeTransferState(() => {
      if (getTransferState().kind) {
        dirty = true;
        clearTimeout(timer);
      } else if (dirty) schedule();
    });
    refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
      listener.remove();
      unsubscribe();
    };
  }, [tableKey, scope]);

  return {
    data: snapshot.scope === scope && snapshot.tableKey === tableKey ? snapshot.data : [],
    error,
  };
}
