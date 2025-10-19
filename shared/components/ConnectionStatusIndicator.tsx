/**
 * ConnectionStatusIndicator Component
 *
 * Simple WebSocket connection status indicator.
 * Shows a green circle when connected, red when disconnected.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useWebSocketStatus } from '~/hooks/RealTimeSync/useWebSocketStatus';

export function ConnectionStatusIndicator() {
  const { isConnected } = useWebSocketStatus();

  return <View style={[styles.circle, { backgroundColor: isConnected ? '#10B981' : '#EF4444' }]} />;
}

const styles = StyleSheet.create({
  circle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 8,
  },
});
