import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { syncManagerInstance } from '~/services/sync/syncService';

export const SyncStatusBar = () => {
  const [status, setStatus] = useState(syncManagerInstance.getDisplayStatus());

  useEffect(() => {
    const unsubscribe = syncManagerInstance.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={async () => {
          try {
            await syncManagerInstance.syncNow();
          } catch (err) {
            console.error('Manual sync failed:', err);
          }
        }}
        style={({ pressed }) => [
          styles.button,
          {
            borderColor: status.color,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            backgroundColor: pressed ? '#f0f0f0' : 'white',
          },
        ]}>
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.text || 'Sync Pins'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'white',
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statusText: { fontSize: 16, fontWeight: '600' },
});
