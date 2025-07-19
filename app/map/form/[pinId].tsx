import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView } from 'react-native';
import Form from 'components/Form';
import { useFetchForms } from '~/hooks/Forms';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();

  const { data: form, error, isLoading } = useFetchForms(pinId);
  console.log(form);
  return (
    <ScrollView>
      <Text>Fetch Previous Forms here: create form UI</Text>
      <Text>Create New Form:</Text>
      <Form onClose={() => console.log('closed form')} />
    </ScrollView>
  );
}
