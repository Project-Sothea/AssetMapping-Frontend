import { useEffect } from 'react';

import { webSocketManager } from '~/services/websocket/WebSocketManager';

/** Maintain connection status only; data transfers are explicitly manual. */
export function useRealTimeSync(deviceId: string | undefined) {
  useEffect(() => {
    if (!deviceId) return;
    webSocketManager
      .connect(deviceId)
      .catch((error) => console.warn('Connection unavailable:', error));
  }, [deviceId]);
}
