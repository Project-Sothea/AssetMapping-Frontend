import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import type { Pin } from '~/db/types';
import { useFetchForms } from '~/features/forms/hooks/useFetchForms';
import { usePinQueueStatus } from '~/hooks/RealTimeSync/usePinQueueStatus';
import { FallbackImageList } from '~/shared/components/FallbackImageList';
import { MaterialIcons } from '@expo/vector-icons';
import { SwipeableCard } from '~/shared/components/ui/SwipeableCard';

type PinCardProps = {
  pin: Pin;
  onNavigateToMap?: (pin: Pin) => void;
};

export const PinCard: React.FC<PinCardProps> = ({ pin, onNavigateToMap }) => {
  const router = useRouter();
  const { data: forms = [] } = useFetchForms(pin.id);

  // Check sync status from operations table
  const isSynced = usePinQueueStatus(pin.id);

  // Dynamic accent color based on synced status
  const accentColor = isSynced ? '#10B981' : '#e74c3c'; // green if synced, red if not

  const handleViewForms = () => {
    router.push({ pathname: '/form/[pinId]', params: { pinId: pin.id, pinName: pin.name } });
  };

  const renderRightActions = () => {
    if (!pin.lat || !pin.lng || !onNavigateToMap) return null;

    return (
      <TouchableOpacity
        style={styles.mapAction}
        onPress={() => onNavigateToMap(pin)}
        activeOpacity={0.7}>
        <MaterialIcons name="directions" size={24} color="#fff" />
        <Text style={styles.mapActionText}>Open Map</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SwipeableCard renderRightActions={renderRightActions}>
      <TouchableOpacity style={styles.card} onPress={handleViewForms} activeOpacity={0.7}>
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{pin.name}</Text>
            <View
              style={[
                styles.formCountBadge,
                { backgroundColor: forms.length === 0 ? '#E5E7EB' : '#4F46E5' },
              ]}>
              <Text
                style={[styles.formCountText, { color: forms.length === 0 ? '#9CA3AF' : '#fff' }]}>
                {forms.length}
              </Text>
            </View>
          </View>
          {pin.description && <Text style={styles.description}>{pin.description}</Text>}

          {/* Display images using FallbackImageList */}
          {(pin.localImages || pin.images) && (
            <FallbackImageList
              localImages={pin.localImages}
              remoteImages={pin.images}
              entityId={pin.id}
              imageStyle={styles.thumbnail}
              containerStyle={styles.imageScroll}
            />
          )}
        </View>
      </TouchableOpacity>
    </SwipeableCard>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  name: {
    fontWeight: '700',
    fontSize: 18,
    color: '#111827',
    flex: 1,
  },
  formCountBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  formCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  imageScroll: {
    marginBottom: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  mapAction: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 14,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    minWidth: 100,
  },
  mapActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
});
