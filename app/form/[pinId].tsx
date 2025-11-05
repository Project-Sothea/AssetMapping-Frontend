import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import { useFetchForms } from '~/features/forms/hooks/useFetchForms';
import { useCreateForm } from '~/features/forms/hooks/useCreateForm';
import { useUpdateForm } from '~/features/forms/hooks/useUpdateForm';
import { useDeleteForm } from '~/features/forms/hooks/useDeleteForm';
import { Form as FormType } from '~/db/schema';
import { FormCard } from '~/features/forms/components/Form/FormCard';
import { FormDetailsModal } from '~/features/forms/components/Form/FormDetailsModal';
import { ErrorHandler } from '~/shared/utils/errorHandling';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();
  const { data: forms } = useFetchForms(pinId);
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const { createFormAsync } = useCreateForm();
  const { updateFormAsync } = useUpdateForm();
  const { deleteFormAsync } = useDeleteForm();

  const handleModalClose = () => {
    setSelectedForm(null);
    setModalVisible(false);
  };

  const handleFormPress = (form: FormType) => {
    setSelectedForm(form);
    setModalVisible(true);
  };

  const handleFormDelete = (formId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this form?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFormAsync(formId);
            Alert.alert('Form Deleted!');
          } catch (error) {
            const appError = ErrorHandler.handle(error, 'Failed to delete form');
            ErrorHandler.showAlert(appError, 'Error');
          }
        },
      },
    ]);
  };

  const handleFormSubmit = async (values: any) => {
    try {
      if (selectedForm) {
        // Update existing form
        await updateFormAsync({ id: selectedForm.id, values });

        Alert.alert('Form Updated!');
        setSelectedForm(null);
        setModalVisible(false);
      } else {
        // Create new form
        await createFormAsync(values);

        Alert.alert('Form Created!');
        setSelectedForm(null);
        setModalVisible(false);
      }
    } catch (error) {
      const appError = ErrorHandler.handle(error, 'Failed to submit form');
      ErrorHandler.showAlert(appError, 'Error');
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{`${pinName}'s Forms`}</Text>

      {forms?.length === 0 && (
        <Text style={styles.emptyText}>No forms submitted yet. Start by creating one below!</Text>
      )}

      <View style={styles.formsList}>
        {forms?.map((form) => (
          <FormCard
            key={form.id}
            form={form}
            onPress={handleFormPress}
            onDelete={handleFormDelete}
          />
        ))}
      </View>

      <View style={styles.newFormSection}>
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
