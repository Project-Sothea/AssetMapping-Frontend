import { Stack, Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Tabs>
          <Tabs.Screen name="index" />
          <Tabs.Screen name="downloads" />
        </Tabs>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
