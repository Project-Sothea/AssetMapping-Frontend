import { Stack } from 'expo-router';
import { Button } from '~/components/Button';
import { pinSyncManager } from '~/services/sync/pinSyncManager';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Button onPress={async () => await pinSyncManager.syncNow()} title="Sync Pins"></Button>
    </>
  );
}
