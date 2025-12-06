import { View, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useCreatePin } from '~/features/pins/hooks/useCreatePin';
import { useUpdatePin } from '~/features/pins/hooks/useUpdatePin';
import { useDeletePin } from '~/features/pins/hooks/useDeletePin';
import { PinForm } from './PinForm';
import type { Pin, PinValues } from '../types';
import { MaterialIcons } from '@expo/vector-icons';

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

  if (props.mode === 'create') {
    return (
      <ScrollView>
        <PinForm onSubmit={handleCreateSubmit} selectedPin={null} coords={props.coords} />
      </ScrollView>
    );
  }

  return (
    <View>
      <PinForm onSubmit={handleUpdateSubmit} selectedPin={props.pin} />
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={props.onCancel} style={[styles.iconBtn, styles.muted]}>
          <MaterialIcons name="visibility" size={22} color="#111" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={[styles.iconBtn, styles.danger]}>
          <MaterialIcons name="delete" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
  },
  muted: {
    backgroundColor: '#e5e7eb',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
});
