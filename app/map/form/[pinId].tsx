import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import Form from 'components/Form';
import { useFetchForms, useSoftDeleteForm } from '~/hooks/Forms';
import { Form as FormType } from '~/utils/globalTypes';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();
  const { data: form, error, isLoading } = useFetchForms(pinId);
  const { mutate: softDeleteForm } = useSoftDeleteForm();

  const [editingForm, setEditingForm] = useState<FormType | null>(null);

  const handleEdit = (form: FormType) => { 
    setEditingForm(form);
  };

  const handleDelete = (formId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this form?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => softDeleteForm(formId),
      },
    ]);
  };

  const handleCloseForm = () => {
    setEditingForm(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{`${pinName}'s Forms`}</Text>

      {isLoading && <Text>Loading forms...</Text>}
      {error && <Text>Error fetching forms.</Text>}
      {form?.length === 0 && !isLoading && <Text>No forms submitted yet.</Text>}

      {form?.map((form) => (
        <View key={form.id} style={styles.formCard}>
          <Text>Submitted on: {new Date(form.created_at).toLocaleString()}</Text>
          <Button title="Edit" onPress={() => handleEdit(form)} />
          <View style={styles.spacer} />
          <Button color="red" title="Delete" onPress={() => handleDelete(form.id)} />
        </View>
      ))}

      <View style={styles.formSpacer} />
      <Text style={styles.subheading}>
        {editingForm ? 'Edit Form' : 'Create New Form'}
      </Text>
      <Form
        pinId={pinId}
        formId={editingForm?.id}
        initialData={editingForm || undefined}
        onClose={handleCloseForm}
      />
    </ScrollView>
  );
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