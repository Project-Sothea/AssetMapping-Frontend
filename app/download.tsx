import { offlineManager } from '@rnmapbox/maps';
import { Button } from '~/components/Button';
import { Text, View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { ScreenWrapper } from '~/components/customUI/ScreenWrapper';
import useCreatePack from '~/hooks/useCreatePack';
import { useDeletePack } from '~/hooks/useDeletePack';
import { useFetchPacks } from '~/hooks/useFetchPacks';
import Spacer from '~/components/customUI/Spacer';
import { packSreO } from '~/data/testingData';

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
  const { mutateAsync: createPackMutation } = useCreatePack();
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs, isPending } = useFetchPacks();

  return (
    <ScreenWrapper>
      <Spacer />

      <Button
        title="Create Pack"
        onPress={async () => {
          try {
            await createPackMutation(packSreO);
          } catch (err) {
            console.error(err);
          }
        }}
      />
      <Spacer />
      <Button
        title="Delete Pack"
        onPress={async () => {
          try {
            await deletePackMutation(packSreO.name);
            console.log('successful delete: ', packSreO.name);
          } catch (err) {
            console.error(err);
          }
        }}
      />

      <Text>Downloaded Packs:</Text>
      {isPending ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.title}>📦 {item.name}</Text>
            </View>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#f9c2ff',
    padding: 3,
    marginVertical: 5,
    marginHorizontal: 5,
  },
  title: {
    fontSize: 10,
  },
});
