import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import QueryProvider from '~/providers/QueryProvider';
import { SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

const createDbIfNeeded = async (db: SQLiteDatabase) => {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS pins (
      id INTEGER PRIMARY KEY, 
      created_at TEXT,
      updated_at TEXT,
      last_modified_by TEXT,
      deleted_at TEXT,
      failure_reason TEXT,
      status TEXT,
      last_synced_at TEXT,
      last_failed_sync_at TEXT,
      lat REAL,
      lng REAL,
      type TEXT,
      location_name TEXT,
      address TEXT,
      state_province TEXT,
      postal_code TEXT,
      country TEXT,
      description TEXT,
      images TEXT);` //need to store as a jsonstring. const jsonString = JSON.stringify(imageArray);
  );
};

export default function Layout() {
  return (
    <SQLiteProvider databaseName="local.db" onInit={createDbIfNeeded}>
      <QueryProvider>
        <SafeAreaProvider>
          <Tabs>
            <Tabs.Screen
              name="index"
              options={{
                title: 'Home',
                tabBarIcon: ({ color = 'black' }) => <TabBarIcon name="home" color={color} />,
              }}
            />
            <Tabs.Screen
              name="map"
              options={{
                headerShown: false,
                tabBarIcon: ({ color = 'black' }) => <TabBarIcon name="map" color={color} />,
              }}
            />
            <Tabs.Screen
              name="download"
              options={{
                title: 'MapManager',
                tabBarIcon: ({ color = 'black' }) => <TabBarIcon name="book" color={color} />,
              }}
            />
          </Tabs>
        </SafeAreaProvider>
      </QueryProvider>
    </SQLiteProvider>
  );
}
