import type { SyncNotification } from '@assetmapping/shared-types';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { performIncrementalSync } from '~/services/sync/syncService';
import { webSocketManager } from '~/services/websocket/WebSocketManager';

// Notifications are hints. Coalesce bursts and read a consistent snapshot instead
// of launching a separate HTTP pull for every pin/form message.
export function useRealTimeSync(deviceId: string | undefined) {
  useEffect(() => {
    if (!deviceId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        performIncrementalSync().catch(() =>
          console.warn('Unable to refresh; local data is preserved.')
        );
      }, 150);
    };
    webSocketManager
      .connect(deviceId)
      .catch(() => console.warn('Notification connection unavailable.'));
    const unsubscribe = webSocketManager.onMessage((message) => {
      if (isSyncNotification(message) && message.deviceId !== deviceId) refresh();
    });
    const lifecycle = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        webSocketManager.connect(deviceId).catch(() => {});
        refresh();
      }
    });
    return () => {
      unsubscribe();
      lifecycle.remove();
      if (timer) clearTimeout(timer);
    };
  }, [deviceId]);
}

function isSyncNotification(message: unknown): message is SyncNotification {
  if (!message || typeof message !== 'object') return false;
  const value = message as Record<string, unknown>;
  return (
    (value.type === 'pin' || value.type === 'form') &&
    ['created', 'updated', 'deleted'].includes(value.action as string) &&
    typeof value.aggregateId === 'string'
  );
}
