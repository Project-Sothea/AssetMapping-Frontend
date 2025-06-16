import { Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '~/components/Button';
import Map from '~/components/Map';
import { ScreenWrapper } from '~/components/ui/ScreenWrapper';

export default function Home() {
  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Map' }} />
      <Map />
    </ScreenWrapper>
  );
}
