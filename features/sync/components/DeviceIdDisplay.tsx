import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { getDeviceId } from '~/shared/utils/getDeviceId';

export function DeviceIdDisplay() {
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
  }, []);

  return (
    <View style={styles.deviceIdContainer}>
      <Text style={styles.deviceIdLabel}>Device ID:</Text>
      <Text style={styles.deviceIdValue}>{deviceId || 'Loading...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  deviceIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIdLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  deviceIdValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
    flex: 1,
  },
});
