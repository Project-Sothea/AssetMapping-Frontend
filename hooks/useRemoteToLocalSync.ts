import { useEffect } from 'react';
import SyncManager from '~/services/sync/SyncManager';

export const useRemoteToLocalSync = () => {
  const syncManager = SyncManager.getInstance();

  useEffect(() => {
    console.log('begin Interval');
    syncManager.syncNow();
    const interval = setInterval(
      () => {
        syncManager.syncNow();
      },
      10 * 60 * 1000
    );

    return () => {
      clearInterval(interval);
      console.log('cleared Interval');
    };
  }, []);
};
