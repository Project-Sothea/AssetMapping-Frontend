import 'react-native-get-random-values';

import { Stack } from 'expo-router';
import { Suspense, type ReactNode } from 'react';
import { ActivityIndicator, View, Text, Button } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useInitialSync } from '~/hooks/RealTimeSync/useInitialSync';
import { useRealTimeSync } from '~/hooks/RealTimeSync/useRealTimeSync';
import { useTransferState } from '~/hooks/RealTimeSync/useTransferState';
import QueryProvider from '~/providers/QueryProvider';
import { DatabaseGate } from '~/shared/components/DatabaseGate';
import { PopupProvider } from '~/shared/contexts/PopupContext';
import { getDeviceId } from '~/shared/utils/getDeviceId';

// Complete the legacy setup check before exposing local records for editing.
function SyncInitializer({ children }: { children: ReactNode }) {
  const deviceId = getDeviceId();
  const { error, isLoading, retry } = useInitialSync();
  const { setupReady, kind } = useTransferState();

  useRealTimeSync(deviceId);

  if (!setupReady || (isLoading && kind === 'setup')) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <Text>{error || 'Initial setup could not finish.'}</Text>
            <Button title="Retry Setup" onPress={() => void retry()} />
          </>
        )}
      </View>
    );
  }
  return children;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Suspense fallback={<ActivityIndicator size={'large'} />}>
        <QueryProvider>
          <SafeAreaProvider>
            <PopupProvider>
              <DatabaseGate>
                <SyncInitializer>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="pin/[pinId]/forms"
                      options={({ route }) => {
                        const { pinName } = route.params as { pinName?: string };
                        return {
                          title: `${pinName ? `Forms of ${pinName}` : 'Forms'}`,
                          headerBackButtonDisplayMode: 'minimal',
                        };
                      }}
                    />
                  </Stack>
                </SyncInitializer>
              </DatabaseGate>
            </PopupProvider>
          </SafeAreaProvider>
        </QueryProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}
