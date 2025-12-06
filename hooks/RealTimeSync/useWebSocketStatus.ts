/**
 * useWebSocketStatus Hook
 *
 * Monitors WebSocket connection status and provides detailed connection state.
 * Works in conjunction with useRealTimeSync to expose connection information.
 *
 * Features:
 * - Real-time connection state tracking
 * - Connection quality metrics (ping latency)
 * - Reconnection attempt tracking
 * - Error state management
 *
 * Usage:
 * ```tsx
 * import { useWebSocketStatus } from '~/hooks/useWebSocketStatus';
 *
 * function MyComponent() {
 *   const { status, isConnected, latency, reconnectAttempts } = useWebSocketStatus();
 *
 *   return (
 *     <View>
 *       <Text>Status: {status}</Text>
 *       {latency && <Text>Latency: {latency}ms</Text>}
 *     </View>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';

import { webSocketManager } from '~/services/websocket/WebSocketManager';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface WebSocketStatus {
  status: ConnectionStatus;
  isConnected: boolean;
  latency: number | null;
  reconnectAttempts: number;
  lastError: string | null;
  lastConnectedAt: Date | null;
  lastDisconnectedAt: Date | null;
}

/**
 * Hook to monitor WebSocket connection status
 */
export function useWebSocketStatus(): WebSocketStatus {
  const [status, setStatus] = useState<WebSocketStatus>({
    status: 'disconnected',
    isConnected: false,
    latency: null,
    reconnectAttempts: 0,
    lastError: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  });

  useEffect(() => {
    // Subscribe to status updates from the WebSocket manager
    const unsubscribe = webSocketManager.subscribe((newStatus: WebSocketStatus) => {
      setStatus(newStatus);
    });

    // Get initial status
    setStatus(webSocketManager.getStatus());

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
