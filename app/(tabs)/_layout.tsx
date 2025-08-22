import { Tabs } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { SyncStatusBar } from '~/components/SyncStatusBar';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function Layout() {
  return (
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
  );
}
