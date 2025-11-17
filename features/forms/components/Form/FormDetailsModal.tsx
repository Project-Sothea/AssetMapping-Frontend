import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import FormEditor from './FormEditor';
import type { Form, FormDB } from '~/db/schema';

type PinDetailsModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: FormDB | null;
  onClose: () => void;
  onSubmit: (values: Form) => void;
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
      <FormEditor
        onSubmit={onSubmit}
        pinId={pinId}
        formId={selectedForm?.id}
        initialData={selectedForm}
      />
    </ModalWrapper>
  );
};
