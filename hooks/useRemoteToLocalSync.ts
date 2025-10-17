import { useEffect } from 'react';
import { getSyncManager } from '~/services/sync/syncService';

export const useRemoteToLocalSync = () => {
  useEffect(() => {
    console.log('begin Interval');
    const interval = setInterval(
      () => {
        try {
          getSyncManager().syncNow();
        } catch (err) {
          console.warn('Sync not initialized; skipping automatic sync', err);
        }
      },
      5 * 60 * 1000
    );

    return () => {
      clearInterval(interval);
      console.log('cleared Interval');
    };
  }, []);
};
