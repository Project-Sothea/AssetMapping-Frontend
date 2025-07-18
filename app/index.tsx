import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
//import { ScreenContent } from '~/components/ScreenContent';
import Form from '~/components/Form';
import { PinForm } from '~/components/PinForm';
import { useBulkFetchForms, useFetchForm } from '~/hooks/Forms/index';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Form onClose={() => console.log()}></Form>
    </>
  );
}
