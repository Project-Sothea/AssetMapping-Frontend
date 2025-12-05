import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Alert } from 'react-native';
import {
  processQueue,
  getQueueMetrics,
  retryFailed,
  clearFailed,
} from '~/services/sync/queue/syncQueue';
import { useQueryClient, useQuery } from '@tanstack/react-query';

export const SyncStatusBar = () => {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [popup, setPopup] = useState<{ message: string; color: string } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Use React Query for polling queue metrics
  const { data: metrics } = useQuery({
    queryKey: ['queueMetrics'],
    queryFn: getQueueMetrics,
    refetchInterval: 3000,
    initialData: { pending: 0, failed: 0, completed: 0 },
  });

  const queuePending = metrics?.pending || 0;
  const queueFailed = metrics?.failed || 0;

  const showPopup = (message: string, color: string) => {
    setPopup({ message, color });

    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setPopup(null));
      }, 1500);
    });
  };

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

  // Construct status display
  const getStatusColor = () => {
    if (isSyncing) return '#3498db'; // Blue for syncing
    if (queueFailed > 0) return '#e74c3c'; // Red for failed
    if (queuePending > 0) return '#f39c12'; // Orange for pending
    return '#27ae60'; // Green for synced
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (queueFailed > 0) return `${queueFailed} failed`;
    if (queuePending > 0) return `${queuePending} pending`;
    return 'Synced';
  };

  const statusColor = getStatusColor();
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
              borderColor: statusColor,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              backgroundColor: pressed ? '#f0f0f0' : 'white',
            },
          ]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{displayText}</Text>
        </Pressable>

        {popup && (
          <Animated.View
            style={[styles.popup, { opacity: fadeAnim, backgroundColor: popup.color }]}>
            <Text style={styles.popupText}>{popup.message}</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' }, // idk if shld remove flex:1... ugh
  buttonWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  button: {
    paddingVertical: 6, // reduced paddings so wldnt look so fat
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: 'white',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusText: { fontSize: 14, fontWeight: '600' },
  popup: {
    position: 'absolute',
    top: '100%', // just below the button
    marginTop: 8, // spacing
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    width: 140,
    alignItems: 'center',
    elevation: 5,
  },
  popupText: { color: 'white', fontWeight: '600', fontSize: 13 },
});
