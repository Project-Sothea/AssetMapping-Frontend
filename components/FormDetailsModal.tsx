import ModalWrapper from './ModalWrapper';
import Form from './Form';
import { Form as FormType } from '~/utils/globalTypes';

type PinDetailsModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: FormType | null;
  onClose: () => void;
};

export const FormDetailsModal = ({
  visible,
  pinId,
  onClose,
  selectedForm,
}: PinDetailsModalProps) => {
  return (
    <ModalWrapper
      title={selectedForm ? 'Edit Form' : 'Create Form'}
      visible={visible}
      onClose={onClose}>
      <Form onClose={onClose} pinId={pinId} formId={selectedForm?.id} initialData={selectedForm} />
    </ModalWrapper>
  );
};
