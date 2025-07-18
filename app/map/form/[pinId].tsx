import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import Form from 'components/Form';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();

  return (
    <View>
      <Form onClose={() => console.log('closed form')} />
    </View>
  );
}
