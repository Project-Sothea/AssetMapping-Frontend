import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Pin } from 'features/pins/types/';
import { FallbackImageList } from '~/shared/components/FallbackImageList';
import { MaterialIcons } from '@expo/vector-icons';

type PinDetailsProps = {
  pin: Pin;
  isSynced: boolean;
  onImagePress: (index: number) => void;
  onEdit: () => void;
  onViewForms: () => void;
};

export function PinDetails({ pin, isSynced, onImagePress, onEdit, onViewForms }: PinDetailsProps) {
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

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onEdit} style={[styles.iconBtn, styles.editChip]}>
          <MaterialIcons name="edit" size={22} color="#1d4ed8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewForms} style={[styles.iconBtn, styles.formsChip]}>
          <MaterialIcons name="description" size={22} color="#065f46" />
        </TouchableOpacity>
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  editChip: {
    backgroundColor: '#e0ebff',
  },
  formsChip: {
    backgroundColor: '#e7f5ec',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
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
