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
      <Stack.Screen
        name="form/[pinId]"
        options={({ route }) => {
          const { pinName } = route.params as { pinName?: string };
          return {
            title: `${pinName ? `New Form for pin ${pinName}` : 'New Form'}`,
          };
        }}
      />
    </Stack>
  );
}
