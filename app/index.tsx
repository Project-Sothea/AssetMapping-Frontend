import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '~/components/Button';
import { Container } from '~/components/Container';
import { ScreenContent } from '~/components/ScreenContent';
import Map from '~/components/Map';
import MapDownloadTest from '~/components/MapDownloadTest';
import { useDeleteOfflineMapPack } from '~/hooks/useDeletePack';

export default function Home() {
  const { deletePack, deleting, error, success } = useDeleteOfflineMapPack();

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      {/* <MapDownloadTest /> */}
      <Button
        title="Delete Offline Map"
        onPress={() => deletePack('MyRegion')}
        disabled={deleting}
      />

      {deleting && <Text>Deleting…</Text>}
      {success && <Text>✅ Pack deleted</Text>}
      {error && <Text style={{ color: 'red' }}>❌ {error}</Text>}

      <Map />
    </>
  );
}
