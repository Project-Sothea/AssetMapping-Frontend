import type { Pin } from '@assetmapping/shared-types';
import { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Text } from 'react-native';

import { useCreatePin } from '~/features/pins/hooks/useCreatePin';
import { useDeletePin } from '~/features/pins/hooks/useDeletePin';
import { useUpdatePin } from '~/features/pins/hooks/useUpdatePin';

import type { PinValues } from '../types';

import { PinForm } from './PinForm';

type PinEditorProps =
  | {
      mode: 'create';
      coords: { lat: number; lng: number };
      onClose: () => void;
    }
  | {
      mode: 'edit';
      pin: Pin;
      onClose: () => void;
      onCancel: () => void;
    };

export function PinEditor(props: PinEditorProps) {
  const { createPinAsync } = useCreatePin();
  const { updatePinAsync } = useUpdatePin();
  const { deletePinAsync } = useDeletePin();
  const submitRef = useRef<(() => void) | null>(null);
  const isCreate = props.mode === 'create';

  const handleCreateSubmit = async (values: PinValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error creating pin');
      return;
    }
    try {
      await createPinAsync(values);
      Alert.alert('Pin Created!');
      props.onClose();
    } catch (error) {
      Alert.alert('Failed to create pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleUpdateSubmit = async (values: PinValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error updating pin');
      return;
    }
    try {
      await updatePinAsync({
        id: values.id,
        updates: {
          name: values.name,
          cityVillage: values.cityVillage,
          address: values.address,
          description: values.description,
          type: values.type,
          images: values.images,
        },
      });
      Alert.alert('Pin Updated!');
      props.onClose();
    } catch (error) {
      Alert.alert('Failed to update pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDelete = async () => {
    if (props.mode !== 'edit') return;
    if (!props.pin?.id) {
      Alert.alert('Error deleting pin');
      return;
    }
    try {
      await deletePinAsync(props.pin.id);
      Alert.alert('Pin Deleted!');
      props.onClose();
    } catch (error) {
      Alert.alert('Failed to delete pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <PinForm
        onSubmit={isCreate ? handleCreateSubmit : handleUpdateSubmit}
        selectedPin={isCreate ? null : props.pin}
        coords={isCreate ? props.coords : undefined}
        onSubmitRegister={(fn) => {
          submitRef.current = fn;
        }}
      />
      <View style={styles.toolbar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Save pin"
          onPress={() => submitRef.current?.()}
          style={[styles.actionButton, styles.primary]}>
          <Text style={styles.actionText}>Save</Text>
        </TouchableOpacity>
        {!isCreate && (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="View pin"
              onPress={props.onCancel}
              style={[styles.actionButton, styles.muted]}>
              <Text style={[styles.actionText, styles.mutedText]}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete pin"
              onPress={handleDelete}
              style={[styles.actionButton, styles.danger]}>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  toolbar: {
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  muted: {
    backgroundColor: '#e5e7eb',
  },
  mutedText: {
    color: '#111',
  },
  danger: {
    backgroundColor: '#e74c3c',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
});
