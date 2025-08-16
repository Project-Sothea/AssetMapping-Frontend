import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Pin } from '~/utils/globalTypes';

type PinCardProps = {
  pin: Pin;
};

export const PinCard: React.FC<PinCardProps> = ({ pin }) => {
  const router = useRouter();

  const handleViewForms = () => {
    router.push({ pathname: '/map/form/[pinId]', params: { pinId: pin.id, pinName: pin.name } });
  };

  // Dynamic accent color based on synced status
  const accentColor = pin.status ? '#10B981' : '#4F46E5'; // green if synced, purple if not

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <Text style={styles.name}>{pin.name}</Text>
        {pin.description && <Text style={styles.description}>{pin.description}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleViewForms}>
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  accent: {
    width: 6,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  name: {
    fontWeight: '700',
    fontSize: 18,
    color: '#111827',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
