import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { syncManagerInstance } from '~/services/sync/syncService';

export const SyncStatusBar = () => {
  const [status, setStatus] = useState(syncManagerInstance.getDisplayStatus());

  useEffect(() => {
    const unsubscribe = syncManagerInstance.subscribe(setStatus);
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { fontSize: 16, fontWeight: '600' },
});
