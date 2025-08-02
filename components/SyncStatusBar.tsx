// components/SyncStatusHeader.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConnectivityManager } from '~/services/ConnectivityManager';
import { pinSyncManager } from '~/services/sync/pinSyncManager';

export const SyncStatusBar = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnectionChange = (status: boolean) => {
      setIsConnected(status);
    };

    const manager = ConnectivityManager.getInstance();
    manager.subscribe(handleConnectionChange);

    const originalSyncNow = pinSyncManager.syncNow.bind(pinSyncManager);
    pinSyncManager.syncNow = async () => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        await originalSyncNow();
      } catch (e: any) {
        setSyncError(e.message || 'Unknown error');
      } finally {
        setIsSyncing(false);
      }
    };

    // Optionally trigger a sync on mount if online
    if (manager.getConnectionStatus()) {
      pinSyncManager.syncNow();
    }

    return () => {
      manager.unsubscribe(handleConnectionChange);
      pinSyncManager.syncNow = originalSyncNow;
    };
  });

  const getStatus = () => {
    if (!isConnected) return { text: 'Offline', color: 'red' };
    if (isSyncing) return { text: 'Syncing...', color: '#007AFF' };
    if (syncError) return { text: 'Sync Failed', color: '#FF3B30' };
    return { text: 'Online', color: '#34C759' };
  };

  const status = getStatus();

  return (
    <View style={styles.container}>
      <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>
        {status.text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Center content vertically and horizontally in header title
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
