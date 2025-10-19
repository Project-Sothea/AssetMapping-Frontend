# WebSocket Connection Status Feature

This document describes the WebSocket connection detection and status monitoring feature implemented in the AssetMapping-Frontend application.

## Overview

The WebSocket connection status feature provides real-time monitoring of the WebSocket connection between the mobile app and the backend server. It includes:

- **Connection state tracking** (disconnected, connecting, connected, reconnecting, error)
- **Latency monitoring** via ping/pong mechanism
- **Automatic reconnection** with exponential backoff
- **Visual status indicator** for users
- **Detailed connection metrics** for debugging

## Architecture

### Components

1. **WebSocketManager** (`services/websocket/WebSocketManager.ts`)

   - Centralized WebSocket connection management
   - Handles connection lifecycle (connect, disconnect, reconnect)
   - Implements ping/pong health monitoring
   - Tracks connection metrics (latency, reconnection attempts)
   - Provides subscription system for status updates

2. **useWebSocketStatus Hook** (`hooks/useWebSocketStatus.ts`)

   - React hook for accessing WebSocket connection status
   - Subscribes to WebSocketManager updates
   - Returns current connection state and metrics

3. **useRealTimeSync Hook** (`hooks/useRealTimeSync.ts`)

   - Enhanced to use WebSocketManager
   - Handles real-time data synchronization
   - Invalidates React Query caches on server updates

4. **ConnectionStatusIndicator Component** (`shared/components/ConnectionStatusIndicator.tsx`)
   - Visual UI component showing connection status
   - Color-coded status indicators
   - Expandable view with detailed metrics
   - Can be configured to show only when disconnected

## Connection States

```typescript
type ConnectionStatus =
  | 'disconnected' // Not connected to server
  | 'connecting' // Initial connection attempt
  | 'connected' // Successfully connected
  | 'reconnecting' // Attempting to reconnect after disconnect
  | 'error'; // Connection error occurred
```

## Status Information

```typescript
interface WebSocketStatus {
  status: ConnectionStatus; // Current connection state
  isConnected: boolean; // Quick boolean check
  latency: number | null; // Round-trip time in ms
  reconnectAttempts: number; // Number of reconnection attempts
  lastError: string | null; // Last error message
  lastConnectedAt: Date | null; // When last connected
  lastDisconnectedAt: Date | null; // When last disconnected
}
```

## Usage Examples

### Basic Usage - Get Connection Status

```tsx
import { useWebSocketStatus } from '~/hooks/useWebSocketStatus';

function MyComponent() {
  const { status, isConnected, latency } = useWebSocketStatus();

  return (
    <View>
      <Text>Status: {status}</Text>
      {isConnected && latency && <Text>Latency: {latency}ms</Text>}
    </View>
  );
}
```

### Display Status Indicator

```tsx
import { ConnectionStatusIndicator } from '~/shared/components/ConnectionStatusIndicator';

function MyApp() {
  return (
    <View>
      {/* Show status indicator always */}
      <ConnectionStatusIndicator />

      {/* Or show only when disconnected */}
      <ConnectionStatusIndicator showOnlyWhenDisconnected />

      {/* Or always expanded */}
      <ConnectionStatusIndicator expanded={true} />

      <YourContent />
    </View>
  );
}
```

### Manual WebSocket Control

```tsx
import { webSocketManager } from '~/services/websocket/WebSocketManager';

// Connect manually
webSocketManager.connect('user-123');

// Disconnect
webSocketManager.disconnect();

// Check connection
const isConnected = webSocketManager.isConnected();

// Send custom message
webSocketManager.send({ type: 'custom', data: {} });

// Subscribe to messages
const unsubscribe = webSocketManager.onMessage((message) => {
  console.log('Received:', message);
});

// Later...
unsubscribe();
```

### Subscribe to Status Changes

```tsx
import { webSocketManager } from '~/services/websocket/WebSocketManager';

const unsubscribe = webSocketManager.subscribe((status) => {
  console.log('Connection status changed:', status);

  if (status.isConnected) {
    console.log('Connected! Latency:', status.latency);
  } else if (status.status === 'reconnecting') {
    console.log('Reconnecting, attempt:', status.reconnectAttempts);
  }
});

// Don't forget to unsubscribe
unsubscribe();
```

## Features

### Automatic Reconnection

The WebSocketManager implements automatic reconnection with exponential backoff:

- **Base delay:** 1 second
- **Max delay:** 30 seconds
- **Max attempts:** 10
- **Strategy:** Exponential backoff (delay doubles with each attempt)

Example progression:

1. 1st attempt: 1s delay
2. 2nd attempt: 2s delay
3. 3rd attempt: 4s delay
4. 4th attempt: 8s delay
5. 5th attempt: 16s delay
6. 6th+ attempts: 30s delay (capped)

### Latency Monitoring

The system tracks round-trip latency using ping/pong messages:

- Ping sent every 30 seconds when connected
- Latency measured from ping send to pong receive
- Displayed in the status indicator when available

### Visual Status Indicator

The ConnectionStatusIndicator component shows:

**Compact View:**

- Status icon with color coding:
  - 🟢 Green: Connected
  - 🟡 Amber: Connecting/Reconnecting
  - ⚫ Gray: Disconnected
  - 🔴 Red: Error
- Status text
- Latency (when connected)

**Expanded View (tap to toggle):**

- All compact view information
- Last connected/disconnected time
- Error messages
- Reconnection attempt count

### Color Coding

- **Green (#10B981):** Connected - all systems operational
- **Amber (#F59E0B):** Connecting/Reconnecting - temporary state
- **Gray (#6B7280):** Disconnected - not attempting connection
- **Red (#EF4444):** Error - connection failed

## Integration

The feature is automatically integrated into the app via `app/_layout.tsx`:

```tsx
<QueryProvider>
  <RealTimeSyncInitializer />
  <SafeAreaProvider>
    <ConnectionStatusIndicator showOnlyWhenDisconnected />
    <AppSyncLayer />
    {/* ... rest of app */}
  </SafeAreaProvider>
</QueryProvider>
```

The `RealTimeSyncInitializer` component:

- Generates/retrieves a device ID
- Calls `useRealTimeSync(deviceId)` to establish connection
- Runs once on app startup

## Configuration

### Environment Variables

The WebSocket URL is derived from:

```typescript
const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
```

### Reconnection Settings

Modify in `WebSocketManager.ts`:

```typescript
private readonly baseReconnectDelay = 1000;      // Initial delay
private readonly maxReconnectDelay = 30000;      // Max delay
private readonly maxReconnectAttempts = 10;      // Max attempts
```

### Ping Interval

Modify in `WebSocketManager.ts`:

```typescript
this.pingInterval = setInterval(() => {
  // ...
}, 30000); // 30 seconds
```

## Backend Requirements

The backend must support:

1. **WebSocket endpoint:** `/ws/notifications?userId={userId}`
2. **Message types:**
   - `welcome` - Initial connection confirmation
   - `pong` - Response to ping (for latency)
   - `pin`, `form`, `image`, `system` - Data updates
3. **Ping/pong protocol** for health checks

## Troubleshooting

### Connection keeps dropping

1. Check network stability
2. Verify backend WebSocket server is running
3. Check firewall/proxy settings
4. Review backend logs for connection errors

### High latency

1. Check network connection quality
2. Verify backend server performance
3. Check for network congestion
4. Consider geographic distance to server

### Won't reconnect

1. Check max reconnection attempts not exceeded
2. Verify backend is accessible
3. Check browser console for errors
4. Restart the app to reset connection state

### Status indicator not showing

1. Verify component is rendered in layout
2. Check `showOnlyWhenDisconnected` prop if status is connected
3. Ensure WebSocketManager is initialized via useRealTimeSync

## Testing

### Manual Testing

1. **Start app** - Should show "Connecting..." then "Connected"
2. **Kill backend** - Should show "Reconnecting..." then eventually "Error"
3. **Restart backend** - Should reconnect automatically
4. **Check latency** - Tap indicator to see expanded view with ping time

### Debugging

Enable verbose logging:

```typescript
// In WebSocketManager.ts, all connection events are logged:
console.log('🔌 Connecting to WebSocket:', url);
console.log('✓ WebSocket connected');
console.log('⊘ WebSocket closed');
console.log('🔄 Reconnecting...');
```

## Performance Considerations

- **Minimal overhead:** Status updates only when state changes
- **Efficient subscriptions:** Uses Set for O(1) add/remove
- **No polling:** Event-driven architecture
- **Automatic cleanup:** Timers and subscriptions cleaned up properly
- **Lightweight UI:** Conditional rendering based on connection state

## Future Enhancements

Potential improvements:

1. **Connection quality indicator** - Classify latency (good/fair/poor)
2. **Network type detection** - Show WiFi vs cellular
3. **Bandwidth estimation** - Monitor data transfer rates
4. **Historical metrics** - Track uptime, average latency
5. **Notification on disconnect** - Alert user when connection lost
6. **Manual retry button** - Allow user to force reconnection
7. **Advanced settings** - Let users configure reconnection behavior
8. **Connection analytics** - Track connection patterns over time

## API Reference

See inline documentation in:

- `services/websocket/WebSocketManager.ts`
- `hooks/useWebSocketStatus.ts`
- `hooks/useRealTimeSync.ts`
- `shared/components/ConnectionStatusIndicator.tsx`
