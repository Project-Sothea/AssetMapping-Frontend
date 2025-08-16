import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { syncManagerInstance } from '~/services/sync/syncManagerInstance';
import { formatTimestamp } from '~/utils/getCurrentTimeStamp';

export const SyncStatusBar = () => {
  const TIMER = 5 * 60 * 1000;

  const [syncStatus, setSyncStatus] = useState(syncManagerInstance.getSyncStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      console.log('sync status', syncStatus);
      const latestStatus = syncManagerInstance.getSyncStatus();
      setSyncStatus(latestStatus);
    }, TIMER);

    return () => clearInterval(interval);
  }, []);

  const colorMap: Record<string, string> = {
    Syncing: '#3498db', // Blue
    Remote: '#2ecc71', // Green
    Local: '#f39c12', // Orange
    Unsynced: '#e74c3c', // Red
  };

  const color = colorMap[syncStatus.state] || 'gray';

  return (
    <View style={styles.container}>
      <Text style={[styles.statusText, { color }]} numberOfLines={1}>
        {syncStatus.state}
        {syncStatus.at !== 'n.a.' ? ` (${formatTimestamp(syncStatus.at)})` : ''}
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

/*
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
 */
