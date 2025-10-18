import { useEffect } from 'react';
import { getSyncManager } from '~/services/sync/syncService';
import { processQueueNow } from '~/services/sync/queue';

export const useRemoteToLocalSync = () => {
  useEffect(() => {
    console.log('begin Interval');
    const interval = setInterval(
      async () => {
        try {
          // Process queue first (local → backend)
          await processQueueNow();

          // Then sync from backend (backend → local)
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
