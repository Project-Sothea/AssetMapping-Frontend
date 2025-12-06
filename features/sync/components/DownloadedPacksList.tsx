import { Text, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';

import { useDeletePack } from '~/hooks/OfflinePacks/useDeletePack';
import { useFetchPacks } from '~/hooks/OfflinePacks/useFetchPacks';
import Spacer from '~/shared/components/ui/Spacer';

interface DownloadedPacksListProps {
  excludePackName?: string;
  progress?: number;
}

export function DownloadedPacksList({ excludePackName, progress }: DownloadedPacksListProps) {
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs } = useFetchPacks();

  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeader}>Downloaded Packs</Text>
      <Spacer />
      {packs && packs.length > 0 ? (
        packs
          .filter((item) => (item.name !== excludePackName ? true : progress === 100))
          .map((item) => (
            <TouchableOpacity
              key={item.name}
              onPress={() => {
                Alert.alert('Delete Pack', `Delete "${item.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deletePackMutation(item.name);
                        console.log('Deleted pack:', item.name);
                      } catch (err) {
                        console.error('Delete error:', err);
                      }
                    },
                  },
                ]);
              }}
              style={styles.packRow}>
              <Text style={styles.packName}>📦 {item.name}</Text>
              <Text style={styles.deleteHint}>Delete</Text>
            </TouchableOpacity>
          ))
      ) : (
        <Text style={styles.emptyText}>No packs downloaded yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
  },
  packName: {
    fontSize: 14,
    color: '#111827',
  },
  deleteHint: {
    fontSize: 13,
    color: '#AF0018',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
