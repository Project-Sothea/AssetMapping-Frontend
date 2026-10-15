import 'react-native-get-random-values';

import { Stack } from 'expo-router';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View, Text, Button } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useInitialSync } from '~/hooks/RealTimeSync/useInitialSync';
import { useRealTimeSync } from '~/hooks/RealTimeSync/useRealTimeSync';
import { useTransferState } from '~/hooks/RealTimeSync/useTransferState';
import QueryProvider from '~/providers/QueryProvider';
import { useRunMigrations } from '~/services/drizzleDb';
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
  const { success, error } = useRunMigrations();
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'loading' | 'error' | 'done'>(
    'idle'
  );
  useEffect(() => {
    if (error) {
      setMigrationStatus('error');
      console.error('Migration error:', error);
    } else if (success) {
      setMigrationStatus('done');
    } else {
      setMigrationStatus('loading');
    }
  }, [success, error]);

  // Run version column migration after Drizzle migrations complete
  useEffect(() => {
    if (success) {
      const runVersionMigration = async () => {
        try {
          // Add a small delay to ensure Drizzle has fully created tables
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          console.error('❌ Version migration failed:', err);
          // Migration is idempotent, so failure is not critical
        }
      };
      runVersionMigration();
    }
  }, [success]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {migrationStatus === 'loading' && (
        <View style={{ backgroundColor: '#fffae6', padding: 8 }}>
          <Text>Database migration in progress...</Text>
        </View>
      )}
      {migrationStatus === 'error' && (
        <View style={{ backgroundColor: '#ffdddd', padding: 8 }}>
          <Text>Warning: Database migration failed. Some features may not work correctly.</Text>
        </View>
      )}

      <Suspense fallback={<ActivityIndicator size={'large'} />}>
        <QueryProvider>
          <SafeAreaProvider>
            <PopupProvider>
              {migrationStatus === 'done' && (
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
              )}
            </PopupProvider>
          </SafeAreaProvider>
        </QueryProvider>
      </Suspense>
    </GestureHandlerRootView>
  );
}
