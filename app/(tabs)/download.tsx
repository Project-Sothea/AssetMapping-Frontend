import { Text, View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { ScreenWrapper } from '~/shared/components/ui/ScreenWrapper';
import useCreatePack from '~/hooks/OfflinePacks/useCreatePack';
import { useDeletePack } from '~/hooks/OfflinePacks/useDeletePack';
import { useFetchPacks } from '~/hooks/OfflinePacks/useFetchPacks';
import Spacer from '~/shared/components/ui/Spacer';
import { CreatePackForm } from '~/features/sync/components/OfflinePacks/CreatePackForm';
import PremadePacks from '~/features/sync/components/OfflinePacks/PremadePacks';

export default function Home() {
  const { mutateAsync: createPackMutation, progress, name } = useCreatePack();
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs } = useFetchPacks();
  return (
    <ScreenWrapper>
      <ScrollView>
        <Spacer />
        <PremadePacks
          progress={progress || 0}
          onPress={async (pack) => {
            try {
              await createPackMutation(pack);
            } catch (err) {
              console.error('Premade pack error:', err);
            }
          }}
        />
        
        <CreatePackForm
          onSubmit={async (pack) => {
            try {
              await createPackMutation(pack);
            } catch (err) {
              console.error(err);
            }
          }}
          progress={progress || 0}
        />

        <Spacer />

        {packs &&
          packs
            .filter((item) => (item.name !== name ? true : progress === 100))
            .map((item) => (
              <TouchableOpacity
                key={item.name}
                onPress={() => {
                  Alert.alert('Delete Pack', `Are you sure you want to delete "${item.name}"?`, [
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
                style={styles.deleteButton}>
                <View style={styles.item}>
                  <Text style={styles.title}>📦 {item.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 4,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 4,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 18,
    color: 'red',
  },
});
