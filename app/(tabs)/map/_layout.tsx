import { Stack } from 'expo-router';
import { SyncStatusBar } from '~/features/sync/components/SyncStatusBar';

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
    </Stack>
  );
}
