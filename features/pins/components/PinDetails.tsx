import { View, Text, StyleSheet } from 'react-native';
import type { Pin } from '~/db/schema';
import { FallbackImageList } from '~/shared/components/FallbackImageList';

type PinDetailsProps = {
  pin: Pin;
  isSynced: boolean;
  onImagePress: (index: number) => void;
};

export function PinDetails({ pin, isSynced, onImagePress }: PinDetailsProps) {
  const badgeColor = isSynced ? '#10B981' : '#e74c3c';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{pin.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.statusText}>{isSynced ? 'Synced' : 'Unsynced'}</Text>
        </View>
      </View>

      {pin.images && (
        <FallbackImageList
          images={pin.images}
          pinId={pin.id}
          imageStyle={styles.image}
          containerStyle={styles.imageScroll}
          onImagePress={onImagePress}
        />
      )}

      <Text style={styles.description}>{pin.description || 'No description provided.'}</Text>

      <View style={styles.infoCard}>
        <InfoRow label="City/Village" value={pin.cityVillage} />
        <InfoRow label="Address" value={pin.address} />
      </View>
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
  card: { paddingBottom: 16 },
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
