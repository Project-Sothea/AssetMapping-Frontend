import { useQueryClient, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';

import {
  processQueue,
  getQueueMetrics,
  retryFailed,
  clearFailed,
} from '~/services/sync/queue/syncQueue';
import { usePopup } from '~/shared/contexts/PopupContext';

export const SyncStatusBar = () => {
  const queryClient = useQueryClient();
  const { showPopup } = usePopup();
  const [isSyncing, setIsSyncing] = useState(false);

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
    if (isSyncing) return; // Prevent double-tap

    const beforeMetrics = { pending: queuePending, failed: queueFailed };
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
          showPopup(
            `${beforeMetrics.failed - afterMetrics.failed} synced, ${afterMetrics.failed} still failed`,
            '#f39c12'
          );
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
        } else {
          showPopup('All synced!', 'green');
        }
      } else {
        // Nothing to sync, pull latest from server
        await queryClient.invalidateQueries({ queryKey: ['pins'] });
        await queryClient.invalidateQueries({ queryKey: ['forms'] });
        showPopup('Refreshed!', 'green');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      showPopup('Sync failed!', 'red');
    } finally {
      setIsSyncing(false);
      // Invalidate to refresh metrics immediately
      queryClient.invalidateQueries({ queryKey: ['queueMetrics'] });
    }
  };

  const handleLongPress = async () => {
    // In production, show helpful info instead of allowing deletion
    if (!__DEV__ && queueFailed > 0) {
      Alert.alert(
        'Sync Issues Detected',
        `${queueFailed} operation${queueFailed > 1 ? 's' : ''} failed to sync. This usually means:\n\n• Poor internet connection\n• Server temporarily unavailable\n\nThe app will keep retrying automatically. Data is safe locally.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Development mode only - allow clearing
    if (__DEV__ && queueFailed > 0) {
      Alert.alert(
        'Clear Failed Items (DEV)',
        `Delete ${queueFailed} failed sync operation${queueFailed > 1 ? 's' : ''}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              try {
                await clearFailed();
                // const metrics = await getQueueMetrics(); // Removed: not needed
                showPopup('Failed items cleared', 'green');
                queryClient.invalidateQueries({ queryKey: ['queueMetrics'] });
              } catch (err) {
                console.error('Failed to clear:', err);
                showPopup('Clear failed!', 'red');
              }
            },
          },
        ]
      );
    }
  };

  // Construct status display with 3D styling
  const getStatusStyle = () => {
    if (isSyncing) {
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
    if (isSyncing) return 'Syncing...';
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
