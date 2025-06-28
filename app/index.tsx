import { Stack } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
//import { ScreenContent } from '~/components/ScreenContent';
import Form from '~/components/Form';
import { useBulkFetchForms, useFetchForm } from '~/hooks/Forms/index';

export default function Home() {
  const { data: forms, isLoading: loadingForms } = useBulkFetchForms();
  const { data: form, isLoading: loadingForm } = useFetchForm(
    '804642f2-0035-4e11-a4fe-a7e61cdd8dab'
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      {loadingForms ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Text>All Forms: {forms?.length}</Text>
        </View>
      )}

      {loadingForm ? (
        <ActivityIndicator />
      ) : (
        <View>
          <Text>All Forms: {form?.village}</Text>
        </View>
      )}

      <Form onClose={() => {}}></Form>
    </>
  );
}
