import { Stack } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

export default function mapLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Map',
        }}
      />
      <Stack.Screen name="form" options={{ headerShown: false }}></Stack.Screen>
    </Stack>
  );
}
