import type { Form } from '@assetmapping/shared-types';
import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';

import ModalWrapper from '~/shared/components/ui/ModalWrapper';

import { FormEditor } from './FormEditor';

type FormModalProps = {
  visible: boolean;
  pinId: string;
  selectedForm: Form | null;
  onClose: () => void;
  isSynced?: boolean;
};

export function FormModal({ visible, pinId, selectedForm, onClose, isSynced }: FormModalProps) {
  const [isEditing, setIsEditing] = useState(!selectedForm);

  const busy = useRef(false);
  const guard = useRef<(() => void) | null>(null);
  const updateGuard = useCallback((value: (() => void) | null) => {
    guard.current = value;
  }, []);
  const close = () => {
    if (!busy.current) {
      if (guard.current) guard.current();
      else onClose();
    }
  };

  return (
    <ModalWrapper
      title={selectedForm ? 'Form Details' : 'Create Form'}
      scrollable={false}
      visible={visible}
      onClose={close}>
      {selectedForm && (
        <Text accessibilityLiveRegion="polite" style={{ paddingVertical: 8 }}>
          {isSynced ? 'Synced' : 'Saved on this device · waiting to sync'}
        </Text>
      )}
      <FormEditor
        pinId={pinId}
        selectedForm={selectedForm as Form | null}
        onClose={onClose}
        onCloseGuardChange={updateGuard}
        onBusyChange={(value) => {
          busy.current = value;
        }}
        isEditing={isEditing}
        onToggleEdit={setIsEditing}
      />
    </ModalWrapper>
  );
}
