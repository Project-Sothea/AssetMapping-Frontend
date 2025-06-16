import { Stack, Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const queryClient = new QueryClient();

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
