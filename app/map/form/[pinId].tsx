import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';
import Form from 'components/Form';

export default function FormScreen() {
  const { pinId } = useLocalSearchParams();

  return (
    <View>
      <Form onClose={() => console.log('closed form')} />
    </View>
  );
}
