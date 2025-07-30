import { Stack } from 'expo-router';
import { SyncStatusBar } from '~/components/SyncStatusBar';

export default function mapLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <SyncStatusBar />,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="form/[pinId]"
        options={({ route }) => {
          const { pinName } = route.params as { pinName?: string };
          return {
            title: `${pinName ? `Forms of ${pinName}` : 'Forms'}`,
          };
        }}
      />
    </Stack>
  );
}
