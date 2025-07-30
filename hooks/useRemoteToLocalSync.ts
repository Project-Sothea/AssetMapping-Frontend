import { useEffect } from 'react';
import { pinSyncManager } from '~/services/sync/pinSyncManager';

export const useRemoteToLocalSync = () => {
  useEffect(() => {
    console.log('begin Interval');
    const interval = setInterval(
      () => {
        pinSyncManager.syncNow();
      },
      30 * 60 * 1000
    );

    return () => {
      clearInterval(interval);
      console.log('cleared Interval');
    };
  }, []);
};
