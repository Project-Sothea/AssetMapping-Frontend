/**
 * WebSocket Debug Utilities
 *
 * Helper functions for testing and debugging WebSocket connections
 */

import { webSocketManager } from './WebSocketManager';

/**
 * Test WebSocket connection and log detailed status
 */
export function testWebSocketConnection(): void {
  const status = webSocketManager.getStatus();

  console.log('🔍 WebSocket Connection Status:', {
    status: status.status,
    isConnected: status.isConnected,
    latency: status.latency ? `${status.latency}ms` : 'N/A',
    reconnectAttempts: status.reconnectAttempts,
    lastError: status.lastError,
    lastConnected: status.lastConnectedAt?.toISOString(),
    lastDisconnected: status.lastDisconnectedAt?.toISOString(),
  });
}

/**
 * Send a test message through WebSocket
 */
export function sendTestMessage(message: Record<string, unknown>): boolean {
  console.log('📤 Sending test message:', message);
  const sent = webSocketManager.send(message);
  console.log(sent ? '✓ Message sent' : '✗ Failed to send message');
  return sent;
}

/**
 * Monitor WebSocket status changes
 */
export function monitorWebSocketStatus(durationMs: number = 60000): () => void {
  console.log(`📊 Monitoring WebSocket status for ${durationMs / 1000}s...`);

  const unsubscribe = webSocketManager.subscribe((status) => {
    console.log(`[${new Date().toISOString()}] WebSocket status changed:`, {
      status: status.status,
      isConnected: status.isConnected,
      latency: status.latency,
      reconnectAttempts: status.reconnectAttempts,
    });
  });

  const timeout = setTimeout(() => {
    console.log('⏱️ Monitoring period ended');
    unsubscribe();
  }, durationMs);

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}

/**
 * Get connection health metrics
 */
export function getConnectionHealth(): {
  isHealthy: boolean;
  issues: string[];
  metrics: {
    status: string;
    isConnected: boolean;
    latency: number | null;
    uptime: number | null;
  };
} {
  const status = webSocketManager.getStatus();
  const issues: string[] = [];

  if (!status.isConnected) {
    issues.push('Not connected');
  }

  if (status.lastError) {
    issues.push(`Last error: ${status.lastError}`);
  }

  if (status.latency && status.latency > 1000) {
    issues.push(`High latency: ${status.latency}ms`);
  }

  if (status.reconnectAttempts > 0) {
    issues.push(`Reconnect attempts: ${status.reconnectAttempts}`);
  }

  const uptime =
    status.lastConnectedAt && status.isConnected
      ? Date.now() - status.lastConnectedAt.getTime()
      : null;

  return {
    isHealthy: issues.length === 0 && status.isConnected,
    issues,
    metrics: {
      status: status.status,
      isConnected: status.isConnected,
      latency: status.latency,
      uptime,
    },
  };
}

/**
 * Force immediate reconnection
 */
export function forceReconnect(userId: string): void {
  console.log('🔄 Forcing WebSocket reconnection...');
  webSocketManager.disconnect();
  setTimeout(() => {
    webSocketManager.connect(userId);
  }, 100);
}

/**
 * Log all WebSocket messages for debugging
 */
export function logAllMessages(durationMs: number = 60000): () => void {
  console.log(`📨 Logging all WebSocket messages for ${durationMs / 1000}s...`);

  const unsubscribe = webSocketManager.onMessage((message) => {
    console.log(`[${new Date().toISOString()}] WebSocket message:`, message);
  });

  const timeout = setTimeout(() => {
    console.log('⏱️ Message logging period ended');
    unsubscribe();
  }, durationMs);

  return () => {
    clearTimeout(timeout);
    unsubscribe();
  };
}
