import { offlineManager } from '@rnmapbox/maps';
import { Button } from '~/components/Button';
import { FlatList, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '~/components/customUI/ScreenWrapper';
import useCreatePack from '~/hooks/useCreatePack';
import { useDeletePack } from '~/hooks/useDeletePack';
import { useFetchPacks } from '~/hooks/useFetchPacks';
import MapboxGL from '~/services/mapbox';
import Spacer from '~/components/customUI/Spacer';

type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];

//[12.829081, 103.390774],
//[12.828122, 103.389739],

//1.323406, 103.917268
//1.322490, 103.916605

const pack1: UseCreatePackProps = {
  name: 'Sre O Primary School',
  styleURL: MapboxGL.StyleURL.Satellite,
  bounds: [
    [103.920438, 1.328571],
    [103.90131, 1.314171],
  ],
  minZoom: 16,
  maxZoom: 18,
};

type ItemProps = { title: string };

const Item = ({ title }: ItemProps) => (
  <View style={styles.item}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

export default function Home() {
  const { createPackMutation, progress, error } = useCreatePack();
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs, isPending } = useFetchPacks();

  return (
    <ScreenWrapper>
      <FlatList
        data={packs || []}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) =>
          isPending ? (
            <ActivityIndicator />
          ) : (
            <Item title={`${item.name}, ${item.bounds}, ${progress}}`}></Item>
          )
        }></FlatList>
      <Button
        title="Create Pack"
        onPress={async () => {
          try {
            await createPackMutation(pack1);
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
            await deletePackMutation(pack1.name);
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
