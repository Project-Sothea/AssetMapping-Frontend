import type { Form } from '@assetmapping/shared-types';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert } from 'react-native';

import { FormCard } from '~/features/forms/components/FormCard';
import { FormModal } from '~/features/forms/components/FormModal';
import { useFetchForms } from '~/features/forms/hooks/useFetchForms';
import { getFormById } from '~/features/forms/services/FormService';
import type { FormSummary } from '~/features/forms/types';
import { usePendingEntityIds } from '~/hooks/RealTimeSync/usePendingEntityIds';

export default function FormScreen() {
  const { pinId, pinName } = useLocalSearchParams<{ pinId: string; pinName: string }>();
  const forms = useFetchForms(pinId);
  const pendingFormIds = usePendingEntityIds('form');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const opening = useRef(false);
  const handleModalClose = () => {
    opening.current = false;
    setSelectedForm(null);
    setModalVisible(false);
  };

  const handleFormPress = useCallback(async (summary: FormSummary) => {
    if (opening.current) return;
    opening.current = true;
    try {
      const form = await getFormById(summary.id);
      if (!form) throw new Error('This form is no longer on this device.');
      setSelectedForm(form);
      setModalVisible(true);
    } catch (error) {
      opening.current = false;
      Alert.alert('Unable to open form', error instanceof Error ? error.message : 'Try again.');
    }
  }, []);

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        data={forms}
        keyExtractor={(form) => form.id}
        renderItem={({ item }) => (
          <FormCard
            form={item}
            isSynced={item.status === 'synced' && !pendingFormIds.has(item.id)}
            onPress={handleFormPress}
          />
        )}
        ListHeaderComponent={<Text style={styles.heading}>{`${pinName}'s Forms`}</Text>}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No forms submitted yet. Start by creating one below!</Text>
        }
        ListFooterComponent={
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
        }
      />

      {modalVisible && (
        <FormModal
          visible={modalVisible}
          pinId={pinId}
          selectedForm={selectedForm}
          isSynced={
            !!selectedForm &&
            forms.find((form) => form.id === selectedForm.id)?.status === 'synced' &&
            !pendingFormIds.has(selectedForm.id)
          }
          onClose={handleModalClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  emptyText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
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
