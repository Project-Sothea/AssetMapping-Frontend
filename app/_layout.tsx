import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import QueryProvider from '~/providers/QueryProvider';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { pins } from '~/db/schema';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/sqlite/migrations';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { migrateAddVersionColumn } from '~/db/migrations/add_version_column';
import { useRealTimeSync } from '~/hooks/RealTimeSync/useRealTimeSync';
import { getDeviceId } from '~/shared/utils/getDeviceId';
import { PopupProvider } from '~/shared/contexts/PopupContext';
import { useInitialSync } from '~/hooks/RealTimeSync/useInitialSync';

export const DATABASE_NAME = 'local.db';
const expoDB = SQLite.openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDB, { schema: { pins } });

// Helper component to initialize real-time sync and initial data sync
function SyncInitializer() {
  const deviceId = getDeviceId();
  const { isLoading: initialSyncLoading, error: initialSyncError } = useInitialSync();

  useRealTimeSync(deviceId);

  // Show loading indicator during initial sync
  if (initialSyncLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>Syncing data...</Text>
      </View>
    );
  }

  // Show error if initial sync failed, but still allow app to continue
  if (initialSyncError) {
    console.warn('Initial sync failed, but app will continue:', initialSyncError);
  }

  return null;
}

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'loading' | 'error' | 'done'>(
    'idle'
  );
  useDrizzleStudio(expoDB);

  useEffect(() => {
    if (error) {
      setMigrationStatus('error');
      console.error('Migration error:', error);
    } else if (success) {
      setMigrationStatus('done');
      console.log('✅ Database migrations completed');
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

          console.log('🔄 Running version column migration...');
          const result = await migrateAddVersionColumn(DATABASE_NAME);

          if (result.success) {
            console.log('✅ Version migration complete!');
          } else if (result.reason === 'tables_not_created') {
            console.log('ℹ️  Tables not ready yet, version columns will be added in schema');
          }
        } catch (err) {
          console.error('❌ Version migration failed:', err);
          // Migration is idempotent, so failure is not critical
        }
      };
      runVersionMigration();
    }
  }, [success]);

  return (
    <>
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
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          options={{ enableChangeListener: true }}
          useSuspense>
          <QueryProvider>
            <SyncInitializer />
            <SafeAreaProvider>
              <PopupProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="form/[pinId]"
                    options={({ route }) => {
                      const { pinName } = route.params as { pinName?: string };
                      return {
                        title: `${pinName ? `Forms of ${pinName}` : 'Forms'}`,
                        headerBackTitle: 'All forms',
                        headerBackTitleVisible: false,
                      };
                    }}
                  />
                </Stack>
              </PopupProvider>
            </SafeAreaProvider>
          </QueryProvider>
        </SQLiteProvider>
      </Suspense>
    </>
  );
}
