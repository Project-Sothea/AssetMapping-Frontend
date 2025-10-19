/**
 * WebSocket Services
 *
 * Central export point for WebSocket-related functionality
 */

// Main WebSocket manager
export { webSocketManager } from './WebSocketManager';

// Debug utilities
export {
  testWebSocketConnection,
  sendTestMessage,
  monitorWebSocketStatus,
  getConnectionHealth,
  forceReconnect,
  logAllMessages,
} from './WebSocketDebug';

// Types
export type { WebSocketStatus, ConnectionStatus } from '~/hooks/useWebSocketStatus';
