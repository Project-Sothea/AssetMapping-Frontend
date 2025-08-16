import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useFetchLocalForms } from '~/hooks/Forms';
import { Form as FormType } from '~/utils/globalTypes';
import { FormDetailsModal } from '~/components/FormDetailsModal';
import { localFormRepo } from '~/services/sync/syncService';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();
  const { data: forms } = useFetchLocalForms(pinId);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const handleModalClose = () => {
    setSelectedForm(null);
    setModalVisible(false);
    console.log('closed form');
  };

  const handleFormEdit = (form: FormType) => {
    console.log('village', form.village);
    setModalVisible(true);
    setSelectedForm(form);
  };

  const handleFormDelete = (formId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this forms?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => localFormRepo.delete(formId),
      },
    ]);
  };

  const handleFormSubmit = (values: any) => {
    console.log('submitting');

    if (selectedForm) {
      localFormRepo.update(values);
      // updateForm({ id: selectedForm.id, values: snakeCaseValues });
      setSelectedForm(null);
      Alert.alert('Form Updated!');
    } else {
      localFormRepo.create(values);
      Alert.alert('Form Created!');
    }

    setModalVisible(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{`${pinName}'s Forms`}</Text>

      {forms?.length === 0 && <Text>No forms submitted yet.</Text>}

      {forms?.map((form) => (
        <View key={form.id} style={styles.formCard}>
          <Text>Submitted on: {new Date(form.createdAt).toLocaleString()}</Text>
          <Button title="View" onPress={() => handleFormEdit(form)} />
          <View style={styles.spacer} />
          <Button color="red" title="Delete" onPress={() => handleFormDelete(form.id)} />
        </View>
      ))}

      <View style={styles.formSpacer} />
      <Text style={styles.subheading}>Create New Form</Text>
      <Button
        title="Create New Form"
        onPress={() => {
          setSelectedForm(null);
          setModalVisible(true);
        }}
      />

      <FormDetailsModal
        visible={modalVisible}
        pinId={pinId}
        selectedForm={selectedForm}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
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
