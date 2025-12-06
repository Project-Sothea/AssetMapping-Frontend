import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { PinForm } from './PinForm';
import { useFetchLocalPin } from '~/features/pins/hooks/useFetchPins';
import { usePinQueueStatus } from '~/hooks/RealTimeSync/usePinQueueStatus';
import { ImageModal } from './ImageModal';
import { Button } from '~/shared/components/ui/Button';
import Spacer from '~/shared/components/ui/Spacer';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { PinDetails } from './PinDetails';
import { useCreatePin } from '~/features/pins/hooks/useCreatePin';
import { useUpdatePin } from '~/features/pins/hooks/useUpdatePin';
import { useDeletePin } from '~/features/pins/hooks/useDeletePin';
import { PinFormValues } from '../types/PinFormValues';

type CreatePinModalProps = {
  mode: 'create';
  visible: boolean;
  coords: { lat: number; lng: number };
  onClose: () => void;
};

type ViewPinModalProps = {
  mode: 'view';
  visible: boolean;
  pinId: string;
  onClose: () => void;
};

type PinModalProps = CreatePinModalProps | ViewPinModalProps;

export function PinModal(props: PinModalProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(props.mode === 'create');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { createPinAsync } = useCreatePin();
  const { updatePinAsync } = useUpdatePin();
  const { deletePinAsync } = useDeletePin();

  const isCreate = props.mode === 'create';
  const pinIdForView = props.mode === 'view' ? props.pinId : '';

  const { data: pin } = useFetchLocalPin(pinIdForView);
  const isSynced = usePinQueueStatus(pinIdForView);

  if (!isCreate && !pin) {
    return (
      <ModalWrapper title="Pin Details" visible={props.visible} onClose={props.onClose}>
        <Text>Pin not found</Text>
      </ModalWrapper>
    );
  }

  const openImage = (index: number) => {
    setActiveIndex(index);
    setImageModalVisible(true);
  };

  const handleViewForms = () => {
    if (!pin) return;
    router.push({ pathname: '/pin/[pinId]/forms', params: { pinId: pin.id, pinName: pin.name } });
  };

  const handleCreateSubmit = async (values: PinFormValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error creating pin');
      return;
    }
    try {
      await createPinAsync(values);
      Alert.alert('Pin Created!');
      setIsEditing(false);
      props.onClose();
    } catch (error) {
      Alert.alert('Failed to create pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleUpdateSubmit = async (values: PinFormValues) => {
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
      setIsEditing(false);
      props.onClose();
    } catch (error) {
      Alert.alert('Failed to update pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDelete = async () => {
    if (!pin?.id) {
      Alert.alert('Error deleting pin');
      return;
    }
    try {
      await deletePinAsync(pin.id);
      Alert.alert('Pin Deleted!');
      props.onClose();
    } catch (error) {
      Alert.alert('Failed to delete pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <ModalWrapper
      title={isCreate ? 'Create Pin' : 'Pin Details'}
      visible={props.visible}
      onClose={props.onClose}>
      {isCreate ? (
        <ScrollView>
          <PinForm onSubmit={handleCreateSubmit} initialValues={null} coords={props.coords} />
        </ScrollView>
      ) : isEditing ? (
        <PinForm onSubmit={handleUpdateSubmit} initialValues={pin!} />
      ) : (
        <View>
          <PinDetails pin={pin!} isSynced={isSynced} onImagePress={openImage} />
          {imageModalVisible && (
            <ImageModal
              visible={imageModalVisible}
              images={pin!.images}
              pinId={pin!.id}
              initialIndex={activeIndex}
              onClose={() => setImageModalVisible(false)}
            />
          )}
        </View>
      )}

      {!isCreate && (
        <>
          <View style={styles.iconRow}>
            <TouchableOpacity
              onPress={() => setIsEditing((prev) => !prev)}
              style={styles.iconButton}>
              <MaterialIcons name={isEditing ? 'visibility' : 'edit'} size={30} color="blue" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
              <MaterialIcons name="delete" size={30} color="red" />
            </TouchableOpacity>
          </View>

          <Spacer />
          <Button title="View Forms" onPress={handleViewForms} />
        </>
      )}
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
  },
});
