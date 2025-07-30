// components/AppSyncLayer.tsx

import { useEffect } from 'react';
import { useRemoteToLocalSync } from '~/hooks/useRemoteToLocalSync';
import { ConnectivityManager } from '~/services/ConnectivityManager';
import { pinSyncManager } from '~/services/sync/pinSyncManager';

export const AppSyncLayer = () => {
  useEffect(() => {
    const handleConnectivityChange = (isConnected: boolean) => {
      console.log('[Network]', isConnected ? 'Online' : 'Offline');
      if (isConnected) {
        pinSyncManager.syncNow();
      }
    };

    const manager = ConnectivityManager.getInstance();
    manager.subscribe(handleConnectivityChange);

    return () => {
      manager.unsubscribe(handleConnectivityChange);
    };
  }, []);

  useRemoteToLocalSync();
  return null;
};
