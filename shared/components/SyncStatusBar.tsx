import { useQueryClient, useQuery } from '@tanstack/react-query';
import React, { useRef, useState, useSyncExternalStore } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';

import { processQueue, getQueueMetrics, retryFailed } from '~/services/sync/queue/syncQueue';
import {
  getSyncInProgress,
  performIncrementalSync,
  subscribeToSync,
} from '~/services/sync/syncService';
import { usePopup } from '~/shared/contexts/PopupContext';

export const SyncStatusBar = () => {
  const queryClient = useQueryClient();
  const { showPopup } = usePopup();
  const [isSyncing, setIsSyncing] = useState(false);
  const pressing = useRef(false);
  const backgroundSync = useSyncExternalStore(
    subscribeToSync,
    getSyncInProgress,
    getSyncInProgress
  );

  // Use React Query for polling queue metrics
  const { data: metrics } = useQuery({
    queryKey: ['queueMetrics'],
    queryFn: getQueueMetrics,
    refetchInterval: 3000,
    initialData: { pending: 0, failed: 0, completed: 0 },
  });

  const queuePending = metrics?.pending || 0;
  const queueFailed = metrics?.failed || 0;

  const handlePress = async () => {
    if (pressing.current || getSyncInProgress()) return;
    pressing.current = true;

    setIsSyncing(true);

    try {
      if (queueFailed > 0) {
        // Retry failed operations first
        await retryFailed();
        await processQueue();

        // Check results after processing
        const afterMetrics = await getQueueMetrics();
        // setQueuePending(afterMetrics.pending); // Removed: useQuery will update
        // setQueueFailed(afterMetrics.failed);

        if (afterMetrics.failed > 0) {
          showPopup(`${afterMetrics.failed} failed, ${afterMetrics.pending} pending`, '#f39c12');
        } else if (afterMetrics.pending > 0) {
          showPopup(`${afterMetrics.pending} pending`, '#f39c12');
        } else {
          showPopup('All synced!', 'green');
        }
      } else if (queuePending > 0) {
        // Process pending operations
        await processQueue();

        // Check results
        const afterMetrics = await getQueueMetrics();
        // setQueuePending(afterMetrics.pending);
        // setQueueFailed(afterMetrics.failed);

        if (afterMetrics.failed > 0) {
          showPopup(`${afterMetrics.failed} failed`, 'red');
        } else if (afterMetrics.pending > 0) {
          showPopup(`${afterMetrics.pending} pending`, '#f39c12');
        } else {
          showPopup('All synced!', 'green');
        }
      } else {
        // Nothing to sync, pull latest from server
        await performIncrementalSync();
        showPopup('Refreshed!', 'green');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      showPopup('Sync failed!', 'red');
    } finally {
      pressing.current = false;
      setIsSyncing(false);
      // Invalidate to refresh metrics immediately
      await queryClient.invalidateQueries({ queryKey: ['queueMetrics'] });
    }
  };

  const handleLongPress = async () => {
    // In production, show helpful info instead of allowing deletion
    if (!__DEV__ && queueFailed > 0) {
      Alert.alert(
        'Sync Issues Detected',
        `${queueFailed} operation${queueFailed > 1 ? 's' : ''} failed to sync. Changes are still waiting to sync on this device. Check your connection, then tap the sync button to retry.`,
        [{ text: 'OK' }]
      );
      return;
    }
  };

  // Construct status display with 3D styling
  const getStatusStyle = () => {
    if (isSyncing || backgroundSync) {
      return {
        backgroundColor: '#3498db',
        shadowColor: '#2980b9',
      };
    }
    if (queueFailed > 0) {
      return {
        backgroundColor: '#e74c3c',
        shadowColor: '#c0392b',
      };
    }
    if (queuePending > 0) {
      return {
        backgroundColor: '#f39c12',
        shadowColor: '#d68910',
      };
    }
    return {
      backgroundColor: '#27ae60',
      shadowColor: '#229954',
    };
  };

  const getStatusText = () => {
    if (isSyncing || backgroundSync) return 'Syncing...';
    if (queueFailed > 0) return `${queueFailed} failed`;
    if (queuePending > 0) return `${queuePending} pending`;
    return 'Synced';
  };

  const statusStyle = getStatusStyle();
  const displayText = getStatusText();

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        <Pressable
          onPress={handlePress}
          disabled={isSyncing || backgroundSync}
          onLongPress={handleLongPress}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: statusStyle.backgroundColor,
              shadowColor: statusStyle.shadowColor,
              transform: [{ scale: pressed ? 0.95 : 1 }],
              shadowOpacity: pressed ? 0.3 : 0.5,
            },
          ]}>
          <Text style={styles.statusText}>{displayText}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
  buttonWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
  },
});
