import { Stack } from 'expo-router';
import { Text } from 'react-native';
import Form from '~/components/Form';
import { PinForm } from '~/components/PinForm';
import { useFetchForm } from '~/hooks/Forms/index';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Text>Hi</Text>
      {/* <Form onClose={() => console.log()}></Form> */}
    </>
  );
}
