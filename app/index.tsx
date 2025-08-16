import { Stack } from 'expo-router';
import { Button } from '~/components/Button';
import { syncManagerInstance } from '~/services/sync/syncManagerInstance';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Button onPress={async () => await syncManagerInstance.syncNow()} title="Sync Pins"></Button>
    </>
  );
}
