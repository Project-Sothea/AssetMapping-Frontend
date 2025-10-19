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
import { initializeDefaultSync } from '~/services/sync/syncService';
import { migrateAddVersionColumn } from '~/db/migrations/add_version_column';
import { useRealTimeSync } from '~/hooks/useRealTimeSync';

export const DATABASE_NAME = 'local.db';
const expoDB = SQLite.openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDB, { schema: { pins } });

// Helper component to initialize real-time sync inside QueryProvider
function RealTimeSyncInitializer() {
  const [deviceId] = useState(() => {
    // Generate a stable device ID or retrieve from storage
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('deviceId') : null;
    if (stored) return stored;

    const newId = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('deviceId', newId);
    }
    return newId;
  });

  useRealTimeSync(deviceId);
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
      // initialize sync environment after successful migrations
      try {
        initializeDefaultSync();
      } catch (err) {
        console.warn('Failed to initialize sync environment', err);
      }
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
            <RealTimeSyncInitializer />
            <SafeAreaProvider>
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
            </SafeAreaProvider>
          </QueryProvider>
        </SQLiteProvider>
      </Suspense>
    </>
  );
}
