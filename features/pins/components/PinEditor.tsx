import type { Pin } from '@assetmapping/shared-types';
import { MaterialIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';

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
          onPress={() => submitRef.current?.()}
          style={[styles.iconBtn, styles.primary]}>
          <MaterialIcons name="save" size={22} color="#fff" />
        </TouchableOpacity>
        {!isCreate && (
          <>
            <TouchableOpacity onPress={props.onCancel} style={[styles.iconBtn, styles.muted]}>
              <MaterialIcons name="visibility" size={22} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, styles.danger]}>
              <MaterialIcons name="delete" size={22} color="#fff" />
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  muted: {
    backgroundColor: '#e5e7eb',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
});
