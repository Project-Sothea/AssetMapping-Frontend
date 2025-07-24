import { Pin } from '~/db/schema';
import ModalWrapper from './ModalWrapper';
import PinDetails from './PinDetails';

type PinDetailsModalProps = {
  visible: boolean;
  pin: Pin;
  onClose: () => void;
};

export const PinDetailsModal = ({ visible, pin, onClose }: PinDetailsModalProps) => {
  return (
    <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
      <PinDetails pin={pin} />
    </ModalWrapper>
  );
};
