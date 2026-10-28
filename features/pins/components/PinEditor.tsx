import type { Pin } from '@assetmapping/shared-types';
import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { useCreatePin } from '~/features/pins/hooks/useCreatePin';
import { useDeletePin } from '~/features/pins/hooks/useDeletePin';
import { useUpdatePin } from '~/features/pins/hooks/useUpdatePin';
import { useTransferState } from '~/hooks/RealTimeSync/useTransferState';

import type { PinValues } from '../types';

import { PinForm } from './PinForm';

type PinEditorProps = {
  onBusyChange?: (busy: boolean) => void;
} & (
  | {
      mode: 'create';
      coords: { lat: number; lng: number };
      onClose: () => void;
    }
  | {
      mode: 'edit';
      pin: Pin;
      onClose: () => void;
      onCancel: () => void;
    }
);

export function PinEditor(props: PinEditorProps) {
  const { createPinAsync } = useCreatePin();
  const { updatePinAsync } = useUpdatePin();
  const { deletePinAsync } = useDeletePin();
  const { busy: transferBusy } = useTransferState();
  const actionRunning = useRef(false);
  const [busy, setBusy] = useState(false);
  const submitRef = useRef<(() => void) | null>(null);
  const isCreate = props.mode === 'create';

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
    errorTitle: string
  ) => {
    if (actionRunning.current || transferBusy) return;
    actionRunning.current = true;
    setBusy(true);
    props.onBusyChange?.(true);
    try {
      await action();
      Alert.alert(successMessage);
      props.onClose();
    } catch (error) {
      Alert.alert(errorTitle, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      actionRunning.current = false;
      setBusy(false);
      props.onBusyChange?.(false);
    }
  };

  const handleCreateSubmit = async (values: PinValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error creating pin');
      return;
    }
    return runAction(() => createPinAsync(values), 'Pin Created!', 'Failed to create pin');
  };

  const handleUpdateSubmit = async (values: PinValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error updating pin');
      return;
    }
    return runAction(
      () =>
        updatePinAsync({
          id: values.id,
          baseline: props.mode === 'edit' ? props.pin : undefined,
          updates: {
            name: values.name,
            cityVillage: values.cityVillage,
            address: values.address,
            description: values.description,
            type: values.type,
            images: values.images,
          },
        }),
      'Pin Updated!',
      'Failed to update pin'
    );
  };

  const handleDelete = async () => {
    if (props.mode !== 'edit') return;
    if (!props.pin?.id) {
      Alert.alert('Error deleting pin');
      return;
    }
    return runAction(
      () => deletePinAsync({ id: props.pin.id, baseline: props.pin }),
      'Pin Deleted!',
      'Failed to delete pin'
    );
  };

  return (
    <View style={styles.container}>
      <PinForm
        disabled={busy || transferBusy}
        onSubmit={isCreate ? handleCreateSubmit : handleUpdateSubmit}
        selectedPin={isCreate ? null : props.pin}
        coords={isCreate ? props.coords : undefined}
        onSubmitRegister={(fn) => {
          submitRef.current = fn;
        }}
      />
      <View style={styles.toolbar}>
        <TouchableOpacity
          accessibilityLabel="Save pin"
          disabled={busy || transferBusy}
          onPress={() => submitRef.current?.()}
          style={[styles.iconBtn, styles.primary]}>
          <MaterialIcons name="save" size={22} color="#fff" />
        </TouchableOpacity>
        {!isCreate && (
          <>
            <TouchableOpacity
              disabled={busy}
              onPress={props.onCancel}
              style={[styles.iconBtn, styles.muted]}>
              <MaterialIcons name="visibility" size={22} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy || transferBusy}
              onPress={() =>
                Alert.alert(
                  'Delete this pin and its forms?',
                  'This will remove the household and all linked responses when synced.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: handleDelete },
                  ]
                )
              }
              style={[styles.iconBtn, styles.danger]}>
              <MaterialIcons name="delete" size={22} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 16 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  muted: {
    backgroundColor: '#e5e7eb',
  },
  danger: {
    backgroundColor: '#ef4444',
  },
  primary: {
    backgroundColor: '#2563eb',
  },
});
