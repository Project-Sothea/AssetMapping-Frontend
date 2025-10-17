import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import Form from './Form';
import { Form as FormType } from '~/utils/globalTypes';

type PinDetailsModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: FormType | null;
  onClose: () => void;
  onSubmit: (values: any) => void;
};

export const FormDetailsModal = ({
  visible,
  pinId,
  onClose,
  onSubmit,
  selectedForm,
}: PinDetailsModalProps) => {
  return (
    <ModalWrapper
      title={selectedForm ? 'Edit Form' : 'Create Form'}
      visible={visible}
      onClose={onClose}>
      <Form
        onSubmit={onSubmit}
        pinId={pinId}
        formId={selectedForm?.id}
        initialData={selectedForm}
      />
    </ModalWrapper>
  );
};
