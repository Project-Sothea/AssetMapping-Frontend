import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { getSyncManager } from '~/services/sync/syncService';
import { formatSyncDisplay, SyncRawState } from '~/services/sync/utils/formatSyncStatus';
import { processQueueNow, getQueueHealth, subscribeToQueueEvents } from '~/services/sync/queue';

export const SyncStatusBar = () => {
  let initialStatus = { text: 'Unsynced', color: '#e74c3c' };
  try {
    const state = getSyncManager().getState();
    initialStatus = formatSyncDisplay(state);
  } catch {
    // not initialized yet, will wait for subscribe if initialized later
  }
  const [status, setStatus] = useState(initialStatus);
  const [queuePending, setQueuePending] = useState(0);
  const [popup, setPopup] = useState<{ message: string; color: string } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    try {
      const unsubscribe = getSyncManager().subscribe((state: SyncRawState) => {
        setStatus(formatSyncDisplay(state));
      });
      return () => unsubscribe();
    } catch {
      // not initialized; nothing to cleanup
      return () => {};
    }
  }, []);

  // Subscribe to queue events
  useEffect(() => {
    const updateQueueStatus = async () => {
      try {
        const health = await getQueueHealth();
        setQueuePending(health.pendingOperations);
      } catch {
        // Queue not ready yet
      }
    };

    // Initial check
    updateQueueStatus();

    // Subscribe to queue events
    const unsubscribe = subscribeToQueueEvents((event) => {
      if (
        event.type === 'operation_enqueued' ||
        event.type === 'operation_completed' ||
        event.type === 'batch_completed'
      ) {
        updateQueueStatus();
      }
    });

    // Poll every 10 seconds
    const interval = setInterval(updateQueueStatus, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

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
    try {
      // Process queue first
      await processQueueNow();

      // Then sync from backend
      await getSyncManager().syncNow();

      showPopup('Sync successful!', 'green');
    } catch (err) {
      console.error('Manual sync failed:', err);
      showPopup('Sync failed!', 'red');
    }
  };

  // Construct status text with queue info
  const displayText =
    queuePending > 0 ? `${status.text} (${queuePending} queued)` : status.text || 'Sync Pins';

  return (
    <View style={styles.container}>
      <View style={styles.buttonWrapper}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            {
              borderColor: status.color,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              backgroundColor: pressed ? '#f0f0f0' : 'white',
            },
          ]}>
          <Text style={[styles.statusText, { color: status.color }]}>{displayText}</Text>
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
  buttonWrapper: { position: 'relative', alignItems: 'center', alignSelf: 'center' },
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
