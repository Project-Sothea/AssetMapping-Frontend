import { Stack } from 'expo-router';
import { SyncStatusBar } from '~/shared/components/SyncStatusBar';
import { ReconnectButton } from '~/shared/components/ReconnectButton';

export default function mapLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: () => <SyncStatusBar />,
          headerTitleAlign: 'center',
          headerRight: () => <ReconnectButton />,
        }}
      />
    </Stack>
  );
}
