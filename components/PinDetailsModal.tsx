import { Pin } from '~/db/schema';
import ModalWrapper from './ModalWrapper';
import PinDetails from './PinDetails';
import { PinFormValues } from './PinForm';

type PinDetailsModalProps = {
  visible: boolean;
  pin: Pin;
  onClose: () => void;
  onUpdate: (formData: PinFormValues) => void;
};

export const PinDetailsModal = ({ visible, pin, onClose, onUpdate }: PinDetailsModalProps) => {
  return (
    <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
      <PinDetails pin={pin} onUpdate={onUpdate} />
    </ModalWrapper>
  );
};
