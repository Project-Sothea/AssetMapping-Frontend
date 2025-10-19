import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Pin } from '~/db/schema';
import { useFetchForms } from '~/features/forms/hooks/useFetchForms';

type PinCardProps = {
  pin: Pin;
};

export const PinCard: React.FC<PinCardProps> = ({ pin }) => {
  const router = useRouter();
  const { data: forms = [] } = useFetchForms(pin.id);

  const handleViewForms = () => {
    router.push({ pathname: '/form/[pinId]', params: { pinId: pin.id, pinName: pin.name } });
  };

  // Dynamic accent color based on synced status
  const accentColor = pin.status === 'synced' ? '#10B981' : '#e74c3c'; // green if synced, red if not

  // Parse local images
  const imageURIs: string[] = useMemo(() => {
    try {
      return pin.localImages && pin.localImages !== '' ? JSON.parse(pin.localImages) : [];
    } catch {
      return [];
    }
  }, [pin.localImages]);

  return (
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

        {/* Display images if any */}
        {imageURIs.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
            contentContainerStyle={styles.imageScrollContent}>
            {imageURIs.map((uri, index) => (
              <Image key={index} source={{ uri }} style={styles.thumbnail} />
            ))}
          </ScrollView>
        )}
      </View>
    </TouchableOpacity>
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
  imageScrollContent: {
    paddingRight: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f3f3f3',
  },
});
