import type { Form } from '@assetmapping/shared-types';
import { useCallback, useRef, useState } from 'react';

import ModalWrapper from '~/shared/components/ui/ModalWrapper';

import { FormEditor } from './FormEditor';

type FormModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: Form | null;
  onClose: () => void;
};

export function FormModal({ visible, pinId, selectedForm, onClose }: FormModalProps) {
  const [isEditing, setIsEditing] = useState(!selectedForm);

  const guard = useRef<(() => void) | null>(null);
  const updateGuard = useCallback((value: (() => void) | null) => {
    guard.current = value;
  }, []);
  const close = () => {
    if (guard.current) guard.current();
    else onClose();
  };

  return (
    <ModalWrapper
      title={selectedForm ? 'Form Details' : 'Create Form'}
      scrollable={false}
      visible={visible}
      onClose={close}>
      <FormEditor
        pinId={pinId}
        selectedForm={selectedForm as Form | null}
        onClose={onClose}
        onCloseGuardChange={updateGuard}
        isEditing={isEditing}
        onToggleEdit={setIsEditing}
      />
    </ModalWrapper>
  );
}
