import { Pin } from '~/db/schema';
import PinDetails from './PinDetails';
import ModalWrapper from '../customUI/ModalWrapper';
import { PinFormValues } from './PinForm';

type PinDetailsModalProps = {
  visible: boolean;
  pin: Pin;
  onClose: () => void;
  onUpdate: (formData: PinFormValues) => void;
  onDelete: (pin: Pin) => void;
};

export const PinDetailsModal = ({
  visible,
  pin,
  onClose,
  onUpdate,
  onDelete,
}: PinDetailsModalProps) => {
  return (
    <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
      <PinDetails pin={pin} onUpdate={onUpdate} onDelete={onDelete} />
    </ModalWrapper>
  );
};
