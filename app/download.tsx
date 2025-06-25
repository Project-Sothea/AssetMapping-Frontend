import { offlineManager } from '@rnmapbox/maps';
import { Button } from '~/components/Button';
import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '~/components/customUI/ScreenWrapper';
import useCreatePack from '~/hooks/useCreatePack';
import { useDeletePack } from '~/hooks/useDeletePack';
import { useFetchPacks } from '~/hooks/useFetchPacks';
import MapboxGL from '~/services/mapbox';
import Spacer from '~/components/customUI/Spacer';
import { coordsSreO, packSreO } from '~/data/testingData';

type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];

type ItemProps = { title: string };

const Item = ({ title }: ItemProps) => (
  <View style={styles.item}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

export default function Home() {
  const { mutateAsync: createPackMutation } = useCreatePack();
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs, isPending } = useFetchPacks();

  return (
    <ScreenWrapper>
      {/* <PackProgressIndicator packName={pack1.name} /> */}
      {/* <Button
        title="Fetch Pack"
        onPress={async () => {
          await fetchOfflinePacks();
        }}
      /> */}
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
