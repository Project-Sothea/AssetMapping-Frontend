import React, { useState, useRef, useEffect } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { webSocketManager } from '~/services/websocket/WebSocketManager';
import { getDeviceId } from '~/shared/utils/getDeviceId';
import { useWebSocketStatus } from '~/hooks/RealTimeSync/useWebSocketStatus';
import { usePopup } from '~/shared/contexts/PopupContext';

export function ReconnectButton() {
  const { isConnected } = useWebSocketStatus();
  const { showPopup } = usePopup();
  const [isSpinning, setIsSpinning] = useState(false);
  const wasConnectedRef = useRef(isConnected);

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = isConnected;

    if (wasConnected === false && isConnected === true) {
      showPopup('Connected!', '#10B981');
    }
  }, [isConnected, showPopup]);

  const handleReconnect = () => {
    if (isConnected) {
      showPopup('Connected!', '#10B981');
      return;
    }

    const deviceId = getDeviceId();
    webSocketManager.connect(deviceId);
    setIsSpinning(true);
    showPopup('Connecting...', '#3498db');
    // Stop spinning after 2 seconds
    setTimeout(() => {
      setIsSpinning(false);
      if (!isConnected) {
        showPopup('Failed to connect', '#EF4444');
      }
    }, 2000);
  };

  let icon;
  if (isConnected) {
    icon = <MaterialIcons name="power" size={24} color="#10B981" />;
  } else if (isSpinning) {
    icon = <ActivityIndicator size="small" color="#EF4444" />;
  } else {
    icon = <MaterialIcons name="power-off" size={24} color="#EF4444" />;
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleReconnect}
        style={({ pressed }) => [styles.button, { transform: [{ scale: pressed ? 0.8 : 1 }] }]}>
        {icon}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  button: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
