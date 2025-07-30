import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import QueryProvider from '~/providers/QueryProvider';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { pins } from '~/db/schema';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '~/drizzle/migrations';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { AppSyncLayer } from '~/components/AppSyncLayer';
import { SyncStatusBar } from '~/components/SyncStatusBar';

export const DATABASE_NAME = 'local.db';
const expoDB = SQLite.openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDB, { schema: { pins } });

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function Layout() {
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
              <Tabs
                screenOptions={{
                  headerTitle: () => <SyncStatusBar />,
                  headerTitleAlign: 'center',
                }}>
                <Tabs.Screen
                  name="index"
                  options={{
                    // Remove the default title because it's replaced by SyncStatusHeader
                    tabBarIcon: ({ color = 'black' }) => <TabBarIcon name="home" color={color} />,
                  }}
                />
                <Tabs.Screen
                  name="map"
                  options={{
                    headerShown: false, // keeping this as you had it
                    tabBarIcon: ({ color = 'black' }) => <TabBarIcon name="map" color={color} />,
                  }}
                />
                <Tabs.Screen
                  name="download"
                  options={{
                    // Remove the title here as well
                    tabBarIcon: ({ color = 'black' }) => <TabBarIcon name="book" color={color} />,
                  }}
                />
              </Tabs>
            </SafeAreaProvider>
          </QueryProvider>
        </SQLiteProvider>
      </Suspense>
    </>
  );
}
