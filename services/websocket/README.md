# WebSocket Connection Management

This directory contains all WebSocket-related functionality for the AssetMapping application.

## Files

- **`WebSocketManager.ts`** - Core WebSocket manager with connection state tracking
- **`WebSocketDebug.ts`** - Debug utilities for testing and monitoring
- **`index.ts`** - Central export point for easy imports
- **`QUICK_REFERENCE.md`** - Code examples and usage patterns

## Quick Start

```typescript
// Import the manager and hooks
import { webSocketManager } from '~/services/websocket';
import { useWebSocketStatus } from '~/hooks/useWebSocketStatus';

// In a component - get status
function MyComponent() {
  const { status, isConnected, latency } = useWebSocketStatus();

  return (
    <View>
      <Text>{status}</Text>
      {latency && <Text>{latency}ms</Text>}
    </View>
  );
}

// Programmatically - connect/disconnect
webSocketManager.connect('user-123');
webSocketManager.disconnect();

// Check connection
const connected = webSocketManager.isConnected();

// Send message
webSocketManager.send({ type: 'ping' });
```

## Features

✅ **Automatic Reconnection** - Exponential backoff strategy  
✅ **Health Monitoring** - Ping/pong latency tracking  
✅ **Status Tracking** - Real-time connection state  
✅ **Event System** - Subscribe to status changes and messages  
✅ **Debug Tools** - Testing and monitoring utilities  
✅ **Type Safety** - Full TypeScript support

## Components

### UI Components

- `<ConnectionStatusIndicator />` - Visual status display

### Hooks

- `useWebSocketStatus()` - Get connection status in React components
- `useRealTimeSync()` - Auto-sync with real-time updates

## Connection States

| State          | Description                |
| -------------- | -------------------------- |
| `disconnected` | Not connected              |
| `connecting`   | Initial connection attempt |
| `connected`    | Successfully connected     |
| `reconnecting` | Attempting to reconnect    |
| `error`        | Connection error           |

## Debug Utilities

```typescript
import {
  testWebSocketConnection,
  getConnectionHealth,
  monitorWebSocketStatus,
  forceReconnect,
} from '~/services/websocket';

// Test connection
testWebSocketConnection();

// Get health metrics
const health = getConnectionHealth();
console.log(health.isHealthy); // true/false
console.log(health.issues); // Array of issues

// Monitor for 60 seconds
const stopMonitoring = monitorWebSocketStatus(60000);

// Force reconnect
forceReconnect('user-123');
```

## Configuration

The WebSocket URL is automatically derived from `EXPO_PUBLIC_API_URL`:

```typescript
// .env
EXPO_PUBLIC_API_URL=http://localhost:3000

// Results in WebSocket URL:
// ws://localhost:3000/ws/notifications
```

## Reconnection Settings

Defaults (can be modified in `WebSocketManager.ts`):

- Base delay: 1 second
- Max delay: 30 seconds
- Max attempts: 10
- Strategy: Exponential backoff

## See Also

- `/docs/WEBSOCKET_CONNECTION_STATUS.md` - Full documentation
- `/docs/WebSocketStatusExamples.tsx` - Example components
- `QUICK_REFERENCE.md` - Quick code examples
