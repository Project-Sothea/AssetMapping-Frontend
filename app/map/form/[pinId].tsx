import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useFetchLocalForms } from '~/hooks/Forms';
import { Form as FormType } from '~/utils/globalTypes';
import { localFormRepo } from '~/services/sync/syncService';
import { FormCard } from '~/components/Form/FormCard';
import { FormDetailsModal } from '~/components/Form/FormDetailsModal';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();
  const { data: forms } = useFetchLocalForms(pinId);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const handleModalClose = () => {
    setSelectedForm(null);
    setModalVisible(false);
  };

  const handleFormEdit = (form: FormType) => {
    setModalVisible(true);
    setSelectedForm(form);
  };

  const handleFormDelete = (formId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this form?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => localFormRepo.delete(formId),
      },
    ]);
  };

  const handleFormSubmit = (values: any) => {
    if (selectedForm) {
      localFormRepo.update(values);
      Alert.alert('Form Updated!');
      setSelectedForm(null);
    } else {
      localFormRepo.create(values);
      Alert.alert('Form Created!');
    }

    setModalVisible(false);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{`${pinName}'s Forms`}</Text>

      {forms?.length === 0 && (
        <Text style={styles.emptyText}>No forms submitted yet. Start by creating one below!</Text>
      )}

      <View style={styles.formsList}>
        {forms?.map((form) => (
          <FormCard key={form.id} form={form} onEdit={handleFormEdit} onDelete={handleFormDelete} />
        ))}
      </View>

      <View style={styles.newFormSection}>
        <Text style={styles.subheading}>Create New Form</Text>
        <Button
          title="Create New Form"
          color="#3498db"
          onPress={() => {
            setSelectedForm(null);
            setModalVisible(true);
          }}
        />
      </View>

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
  scrollView: {
    backgroundColor: '#f7f9fc', // light background
  },
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#34495e',
  },
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  formsList: {
    marginBottom: 24,
  },
  newFormSection: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
