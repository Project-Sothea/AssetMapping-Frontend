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
import { AppSyncLayer } from '~/features/sync/components/AppSyncLayer';
import { initializeDefaultSync } from '~/services/sync/syncService';

export const DATABASE_NAME = 'local.db';
const expoDB = SQLite.openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDB, { schema: { pins } });

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
            <SafeAreaProvider>
              <AppSyncLayer />
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
