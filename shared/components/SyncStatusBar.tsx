import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTransferState } from '~/hooks/RealTimeSync/useTransferState';
import { getQueueMetrics } from '~/services/sync/queue/syncQueue';

export function SyncStatusBar() {
  const { busy, kind } = useTransferState();
  const { data } = useQuery({
    queryKey: ['queueMetrics'],
    queryFn: getQueueMetrics,
    refetchInterval: 2000,
  });
  const label = busy
    ? `${kind || 'Setup'} in progress`
    : !data
      ? 'Checking uploads...'
      : data.failed
        ? `${data.failed} failed / ${data.pending} pending`
        : data.pending
          ? `${data.pending} pending uploads`
          : 'No pending uploads';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Open data transfer`}
      accessibilityLiveRegion="polite"
      onPress={() => router.push('/(tabs)/download')}
      style={styles.status}>
      <Text numberOfLines={2} style={styles.text}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  status: { paddingVertical: 6, paddingHorizontal: 10, maxWidth: 220 },
  text: { color: '#173e4d', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
