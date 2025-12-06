import { useState } from 'react';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { FormEditor } from './FormEditor';
import type { Form } from '../types';

type FormModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: Form | null;
  onClose: () => void;
};

export function FormModal({ visible, pinId, selectedForm, onClose }: FormModalProps) {
  const [isEditing, setIsEditing] = useState(!selectedForm);

  return (
    <ModalWrapper
      title={selectedForm ? 'Form Details' : 'Create Form'}
      visible={visible}
      onClose={onClose}>
      <FormEditor
        pinId={pinId}
        selectedForm={selectedForm as Form | null}
        onClose={onClose}
        isEditing={isEditing}
        onToggleEdit={setIsEditing}
      />
    </ModalWrapper>
  );
}
