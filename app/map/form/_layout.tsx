// app/products/[slug]/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function Layout() {
  const router = useRouter();
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();

  return (
    <Stack>
      <Stack.Screen
        name="[pinId]"
        options={{
          headerTitle: `Add New Form for ${pinName}`,
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              {/* Replace with any icon or text */}
              <FontAwesome name="arrow-circle-left" size={25}></FontAwesome>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
