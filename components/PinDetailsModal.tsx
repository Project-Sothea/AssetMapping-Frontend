import { RePin } from '~/utils/globalTypes';
import ModalWrapper from './ModalWrapper';
import PinDetails from './PinDetails';

type PinDetailsModalProps = {
  visible: boolean;
  pin: RePin;
  onClose: () => void;
};

export const PinDetailsModal = ({ visible, pin, onClose }: PinDetailsModalProps) => {
  return (
    <ModalWrapper title={'Pin Details'} visible={visible} onClose={onClose}>
      <PinDetails pin={pin} />
    </ModalWrapper>
  );
};
