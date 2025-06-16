import { Stack } from 'expo-router';
import { Text } from 'react-native';
import { Button } from '~/components/Button';
import Map from '~/components/Map';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScreenWrapper } from '~/components/ui/ScreenWrapper';

export default function Home() {
  return (
    <ScreenWrapper>
      <Stack.Screen options={{ title: 'Download' }} />
    </ScreenWrapper>
  );
}
