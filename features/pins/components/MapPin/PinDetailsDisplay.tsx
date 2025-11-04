import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';
import { Pin } from '~/db/schema';
import { ImageModal } from './ImageModal';
import { usePinQueueStatus } from '~/hooks/RealTimeSync/usePinQueueStatus';
import { getImageUrisWithFallback } from '~/services/images/imageStrategy';

type PinDetailsProps = { pin: Pin };

export default function PinDetailsDisplay({ pin }: PinDetailsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Check sync status from operations table
  const isSynced = usePinQueueStatus(pin.id);

  // Get image URIs with fallback (remote first, then local)
  const imageURIs = useMemo(
    () => getImageUrisWithFallback(pin.images, pin.localImages),
    [pin.images, pin.localImages]
  );

  const openImage = (index: number) => {
    setActiveIndex(index);
    setModalVisible(true);
  };

  const accentColor = isSynced ? '#10B981' : '#e74c3c'; // green if synced, red if not

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{pin.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.statusText}>{isSynced ? 'Synced' : 'Unsynced'}</Text>
        </View>
      </View>

      {imageURIs.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={140} // image width 130 + marginRight 10
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 8 }}
          style={styles.imageScroll}>
          {imageURIs.map((uri, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => openImage(i)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Image
                source={{ uri, cache: 'force-cache' }}
                style={styles.image}
                onError={(e) =>
                  console.error(`❌ Image ${i} failed to load:`, uri, e.nativeEvent.error)
                }
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={styles.description}>{pin.description || 'No description provided.'}</Text>

      <View style={styles.infoCard}>
        <InfoRow label="City/Village" value={pin.cityVillage} />
        <InfoRow label="Address" value={pin.address} />
        <InfoRow label="Type" value={pin.type} />
      </View>

      {/* Swipeable fullscreen image modal */}
      {modalVisible && (
        <ImageModal
          visible={modalVisible}
          images={imageURIs}
          initialIndex={activeIndex}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}: </Text>
      <Text>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold', flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  imageScroll: { marginBottom: 12 },
  image: {
    width: 130,
    height: 130,
    marginRight: 10,
    borderRadius: 10,
    backgroundColor: '#f3f3f3',
  },
  description: { fontSize: 16, marginBottom: 12 },
  infoCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  label: { fontWeight: 'bold', marginRight: 4 },
});
