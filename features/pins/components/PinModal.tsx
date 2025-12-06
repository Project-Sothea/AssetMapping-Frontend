import { useState } from 'react';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { ImageModal } from './ImageModal';
import { useRouter } from 'expo-router';
import { PinDetails } from './PinDetails';
import { Pin } from '../types/';
import { PinEditor } from './PinEditor';

type CreatePinModalProps = {
  mode: 'create';
  visible: boolean;
  coords: { lat: number; lng: number };
  onClose: () => void;
};

type ViewPinModalProps = {
  mode: 'view';
  visible: boolean;
  pin: Pin;
  onClose: () => void;
};

type PinModalProps = CreatePinModalProps | ViewPinModalProps;

export function PinModal(props: PinModalProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(props.mode === 'create');
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isCreate = props.mode === 'create';
  const pin = props.mode === 'view' ? props.pin : null;
  const isSynced = props.mode === 'view' ? props.pin.status === 'synced' : false;

  const openImage = (index: number) => {
    setActiveIndex(index);
    setImageModalVisible(true);
  };

  const handleViewForms = () => {
    if (!pin) return;
    router.push({ pathname: '/pin/[pinId]/forms', params: { pinId: pin.id, pinName: pin.name } });
  };

  return (
    <ModalWrapper
      title={isCreate ? 'Create Pin' : 'Pin Details'}
      visible={props.visible}
      onClose={props.onClose}>
      {isCreate ? (
        <PinEditor mode="create" coords={props.coords} onClose={props.onClose} />
      ) : isEditing ? (
        <PinEditor
          mode="edit"
          pin={pin!}
          onClose={props.onClose}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <PinDetails
            pin={pin!}
            isSynced={isSynced}
            onImagePress={openImage}
            onEdit={() => setIsEditing(true)}
            onViewForms={handleViewForms}
          />
          {imageModalVisible && (
            <ImageModal
              visible={imageModalVisible}
              images={pin!.images}
              pinId={pin!.id}
              initialIndex={activeIndex}
              onClose={() => setImageModalVisible(false)}
            />
          )}
        </>
      )}
    </ModalWrapper>
  );
}
