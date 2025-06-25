import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function Layout() {
  return (
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
            title: 'Map',
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
  );
}
