import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '~/components/Button';
import { Container } from '~/components/Container';
import { ScreenContent } from '~/components/ScreenContent';
import Map from '~/components/Map'

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
        <Text>lucius was here lol</Text>
        <Map />
    </>
  );
}
