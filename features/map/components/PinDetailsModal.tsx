import type { Pin } from '~/db/schema';
import PinDetails from './PinDetails';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { PinFormValues } from './PinForm';
import { useFetchLocalPin } from '~/features/pins/hooks/useFetchPins';
import { Text } from 'react-native';

type PinDetailsModalProps = {
  visible: boolean;
  pinId: string;
  onClose: () => void;
  onUpdate: (formData: PinFormValues) => void;
  onDelete: (pin: Pin) => void;
};

export const PinDetailsModal = ({
  visible,
  pinId,
  onClose,
  onUpdate,
  onDelete,
}: PinDetailsModalProps) => {
  // Use live query to automatically re-render when pin data changes (e.g., after sync)
  const { data: pin } = useFetchLocalPin(pinId);

  if (!pin) {
    return (
      <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
        <Text>Pin not found</Text>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
      <PinDetails pin={pin} onUpdate={onUpdate} onDelete={onDelete} />
    </ModalWrapper>
  );
};
