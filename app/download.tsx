import { offlineManager } from '@rnmapbox/maps';
import { Button } from '~/components/Button';
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { ScreenWrapper } from '~/components/customUI/ScreenWrapper';
import useCreatePack from '~/hooks/OfflinePacks/useCreatePack';
import { useDeletePack } from '~/hooks/OfflinePacks/useDeletePack';
import { useFetchPacks } from '~/hooks/OfflinePacks/useFetchPacks';
import Spacer from '~/components/customUI/Spacer';
import { packSreO } from '~/data/testingData';
import { CreatePackForm } from '~/components/CreatePackForm';

type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];
// Example:
// {
//   name: 'Sre O Primary School',
//   styleURL: MapboxGL.StyleURL.SatelliteStreet,
//   bounds: [
//     [coordsSreO.maxLng, coordsSreO.maxLat],
//     [coordsSreO.minLng, coordsSreO.minLat],
//   ],
//   minZoom: 16,
//   maxZoom: 22,
// }

export default function Home() {
  const { mutateAsync: createPackMutation, progress } = useCreatePack();
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs, isPending } = useFetchPacks();

  return (
    <ScreenWrapper>
      <ScrollView>
        <Spacer />
        <CreatePackForm
          onSubmit={async (pack) => {
            try {
              await createPackMutation(pack);
            } catch (err) {
              console.error(err);
            }
          }}
          progress={progress}
        />

        <Spacer />

        {packs &&
          packs.map((item) => (
            <View key={item.name} style={styles.item}>
              <TouchableOpacity
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
                <View style={styles.row}>
                  <Text style={styles.title}>📦 {item.name}</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 4,
    borderRadius: 8,
  },
  title: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 18,
    color: 'red',
  },
});
