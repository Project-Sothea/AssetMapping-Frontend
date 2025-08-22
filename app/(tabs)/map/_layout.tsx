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
    </Stack>
  );
}
