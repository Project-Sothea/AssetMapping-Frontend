/**
 * WebSocket Connection Status - Quick Reference
 * 
 * This file provides quick examples of using the WebSocket connection status feature.
 */

// ============================================================================
// 1. BASIC USAGE - Get connection status
// ============================================================================

import { useWebSocketStatus } from '~/hooks/useWebSocketStatus';

function MyComponent() {
  const { status, isConnected, latency } = useWebSocketStatus();
  
  return (
    <View>
      <Text>Status: {status}</Text>
      <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
      {latency && <Text>Ping: {latency}ms</Text>}
    </View>
  );
}

// ============================================================================
// 2. SHOW STATUS INDICATOR
// ============================================================================

import { ConnectionStatusIndicator } from '~/shared/components/ConnectionStatusIndicator';

function MyApp() {
  return (
    <View>
      {/* Always visible */}
      <ConnectionStatusIndicator />
      
      {/* Only when disconnected */}
      <ConnectionStatusIndicator showOnlyWhenDisconnected />
      
      {/* Always expanded */}
      <ConnectionStatusIndicator expanded={true} />
    </View>
  );
}

// ============================================================================
// 3. CONDITIONAL RENDERING - Only show when connected
// ============================================================================

function DataDisplay() {
  const { isConnected } = useWebSocketStatus();
  
  if (!isConnected) {
    return <Text>Waiting for connection...</Text>;
  }
  
  return <YourRealTimeData />;
}

// ============================================================================
// 4. MANUAL CONNECTION CONTROL
// ============================================================================

import { webSocketManager } from '~/services/websocket/WebSocketManager';

// Connect
webSocketManager.connect('user-123');

// Disconnect
webSocketManager.disconnect();

// Check if connected
const connected = webSocketManager.isConnected();

// Get current status
const status = webSocketManager.getStatus();

// ============================================================================
// 5. SEND CUSTOM MESSAGES
// ============================================================================

const success = webSocketManager.send({
  type: 'custom',
  action: 'doSomething',
  payload: { data: 'value' }
});

if (success) {
  console.log('Message sent');
} else {
  console.log('Failed - not connected');
}

// ============================================================================
// 6. LISTEN TO STATUS CHANGES
// ============================================================================

const unsubscribe = webSocketManager.subscribe((status) => {
  console.log('Status changed:', status.status);
  
  if (status.isConnected) {
    console.log('Connected! Latency:', status.latency);
  }
  
  if (status.status === 'error') {
    console.log('Error:', status.lastError);
  }
});

// Later, cleanup
unsubscribe();

// ============================================================================
// 7. LISTEN TO ALL MESSAGES
// ============================================================================

const unsubscribe = webSocketManager.onMessage((message) => {
  console.log('Received:', message);
  
  if (message.type === 'pin') {
    console.log('Pin update:', message.aggregateId);
  }
});

// Later, cleanup
unsubscribe();

// ============================================================================
// 8. DEBUG UTILITIES
// ============================================================================

import {
  testWebSocketConnection,
  sendTestMessage,
  monitorWebSocketStatus,
  getConnectionHealth,
  forceReconnect,
  logAllMessages
} from '~/services/websocket/WebSocketDebug';

// Test connection
testWebSocketConnection();

// Send test message
sendTestMessage({ type: 'ping' });

// Monitor status changes for 60 seconds
const stopMonitoring = monitorWebSocketStatus(60000);

// Get health metrics
const health = getConnectionHealth();
console.log('Is healthy:', health.isHealthy);
console.log('Issues:', health.issues);
console.log('Metrics:', health.metrics);

// Force reconnection
forceReconnect('user-123');

// Log all messages for debugging
const stopLogging = logAllMessages(30000);

// ============================================================================
// 9. CONNECTION QUALITY CHECK
// ============================================================================

function getConnectionQuality(latency: number | null): string {
  if (latency === null) return 'Unknown';
  if (latency < 100) return 'Excellent';
  if (latency < 300) return 'Good';
  if (latency < 500) return 'Fair';
  return 'Poor';
}

function QualityIndicator() {
  const { latency, isConnected } = useWebSocketStatus();
  
  if (!isConnected) {
    return <Text>Disconnected</Text>;
  }
  
  const quality = getConnectionQuality(latency);
  
  return <Text>Connection: {quality} ({latency}ms)</Text>;
}

// ============================================================================
// 10. REACT TO CONNECTION STATE
// ============================================================================

function SmartComponent() {
  const { status } = useWebSocketStatus();
  
  React.useEffect(() => {
    if (status === 'connected') {
      console.log('Connected! Fetching latest data...');
      // Fetch data
    } else if (status === 'error') {
      console.log('Connection error! Using cached data...');
      // Use cached data
    }
  }, [status]);
  
  return <YourContent />;
}
