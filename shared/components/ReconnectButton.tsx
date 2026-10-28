import { MaterialIcons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
import { Pressable, ActivityIndicator } from 'react-native';

import { useWebSocketStatus } from '~/hooks/RealTimeSync/useWebSocketStatus';
import { webSocketManager } from '~/services/websocket/WebSocketManager';
import { usePopup } from '~/shared/contexts/PopupContext';
import { getDeviceId } from '~/shared/utils/getDeviceId';

export function ReconnectButton() {
  const { isConnected } = useWebSocketStatus();
  const { showPopup } = usePopup();
  const [isSpinning, setIsSpinning] = useState(false);
  const wasConnectedRef = useRef(isConnected);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    },
    []
  );

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = isConnected;

    if (!wasConnected && isConnected) {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
      setIsSpinning(false);
      showPopup('Connected!', '#10B981');
    }
  }, [isConnected, showPopup]);

  const handleReconnect = () => {
    if (reconnectTimer.current) return;
    if (webSocketManager.isConnected()) {
      showPopup('Connected!', '#10B981');
      return;
    }

    const deviceId = getDeviceId();
    webSocketManager.connect(deviceId);
    setIsSpinning(true);
    showPopup('Connecting...', '#3498db');
    // Stop spinning after 2 seconds
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      setIsSpinning(false);
      if (!webSocketManager.isConnected()) {
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
    <Pressable
      onPress={handleReconnect}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.8 : 1 }] }]}>
      {icon}
    </Pressable>
  );
}
