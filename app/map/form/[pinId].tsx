import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import Form from 'components/Form';
import { useCreateForm, useFetchForms, useSoftDeleteForm, useUpdateForm } from '~/hooks/Forms';
import { Form as FormType } from '~/utils/globalTypes';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();
  const { data: forms, error, isLoading } = useFetchForms(pinId);

  const [selectedForm, setSelectedForm] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<FormType | null>(null);

  const { mutate: createForm } = useCreateForm();
  const { mutate: updateForm } = useUpdateForm();
  const { mutate: softDeleteForm } = useSoftDeleteForm();

  const handleEdit = (forms: FormType) => {
    setEditingForm(forms);
  };

  const handleDelete = (formId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this forms?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => softDeleteForm(formId),
      },
    ]);
  };

  const handleSubmit = (values: any) => {
    console.log('submitting');
    const snakeCaseValues = toSnakeCase(values); // brushTeeth != brush_teeth (supabase wants this)
    if (forms) {
      forms.forEach((form) => {
        updateForm({ id: form.id, values: snakeCaseValues });
      });
    } else {
      createForm({ ...snakeCaseValues, pin_id: pinId } as Partial<FormType>);
      setEditingForm(null);
      Alert.alert('Form Created!');
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{`${pinName}'s Forms`}</Text>

        {isLoading && <Text>Loading forms...</Text>}
        {error && <Text>Error fetching forms.</Text>}
        {forms?.length === 0 && !isLoading && <Text>No forms submitted yet.</Text>}

        {forms?.map((forms) => (
          <View key={forms.id} style={styles.formCard}>
            <Text>Submitted on: {new Date(forms.created_at).toLocaleString()}</Text>
            <Button title="Edit" onPress={() => handleEdit(forms)} />
            <View style={styles.spacer} />
            <Button color="red" title="Delete" onPress={() => handleDelete(forms.id)} />
          </View>
        ))}

        <View style={styles.formSpacer} />
        <Text style={styles.subheading}>{editingForm ? 'Edit Form' : 'Create New Form'}</Text>
        <Form
          pinId={pinId}
          formId={editingForm?.id}
          initialData={editingForm || undefined}
          onClose={handleSubmit}
        />
      </ScrollView>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  spacer: {
    height: 8,
  },
  formSpacer: {
    height: 20,
  },
});

const toSnakeCase = (obj: Record<string, any>) => {
  const newObj: Record<string, any> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = obj[key];
  }
  return newObj;
};
