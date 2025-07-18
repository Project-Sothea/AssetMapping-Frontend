import ModalWrapper from './ModalWrapper';
import { PinForm, PinFormValues } from './PinForm';

type PinFormModalWrapperProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: PinFormValues) => void;
};

export const PinFormModal = ({ visible, onClose, onSubmit }: PinFormModalWrapperProps) => {
  return (
    <ModalWrapper title={'Create Pin'} visible={visible} onClose={onClose}>
      <PinForm onSubmit={onSubmit} />
    </ModalWrapper>
  );
};
