import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import FormScreen from './Form';
import { Form } from '~/db/types';

type PinDetailsModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: Form | null;
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
      <FormScreen
        onSubmit={onSubmit}
        pinId={pinId}
        formId={selectedForm?.id}
        initialData={selectedForm}
      />
    </ModalWrapper>
  );
};
