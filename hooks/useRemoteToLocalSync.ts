import { useEffect } from 'react';
import { DrizzlePinRepo } from '~/services/sync/implementations/DrizzlePinRepo';
import { PinSyncStrategy } from '~/services/sync/implementations/PinSyncStrategy';
import { SupabasePinRepo } from '~/services/sync/implementations/SupabasePinRepo';
import SyncManager from '~/services/sync/SyncManager';
import { Pin, RePin } from '~/utils/globalTypes';

export const useRemoteToLocalSync = () => {
  const syncManager = SyncManager.getInstance<Pin, RePin>(
    'pin',
    new PinSyncStrategy(),
    new DrizzlePinRepo(),
    new SupabasePinRepo()
  );

  useEffect(() => {
    console.log('begin Interval');
    syncManager.syncNow();
    const interval = setInterval(
      () => {
        syncManager.syncNow();
      },
      30 * 60 * 1000
    );

    return () => {
      clearInterval(interval);
      console.log('cleared Interval');
    };
  }, []);
};
