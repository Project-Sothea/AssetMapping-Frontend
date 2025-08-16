import { useEffect } from 'react';
import { syncManagerInstance } from '~/services/sync/syncService';

export const useRemoteToLocalSync = () => {
  useEffect(() => {
    console.log('begin Interval');
    const interval = setInterval(
      () => {
        syncManagerInstance.syncNow();
      },
      5 * 60 * 1000
    );

    return () => {
      clearInterval(interval);
      console.log('cleared Interval');
    };
  }, []);
};
