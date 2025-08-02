import { Stack } from 'expo-router';
import { ActivityIndicator, Button, Text } from 'react-native';
import { useInternetAvailability } from '~/hooks/useInternetAvailability';

export default function Home() {
  const { isConnected, isLoading, recheckConnection } = useInternetAvailability();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Text>{isConnected ? 'Online' : 'Offline'}</Text>
      <Button title="Recheck" onPress={recheckConnection} />
    </>
  );
}
