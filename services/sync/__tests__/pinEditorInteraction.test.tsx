import type { Pin } from '@assetmapping/shared-types';
import React from 'react';
import { Alert, TextInput, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { PinDetails } from '~/features/pins/components/PinDetails';
import { PinEditor } from '~/features/pins/components/PinEditor';
import { PinForm } from '~/features/pins/components/PinForm';
import { PinModal } from '~/features/pins/components/PinModal';
import { pickImage, saveImageLocally } from '~/services/images/ImageManager';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';

let mockTransferBusy = false;
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
jest.mock('~/features/pins/hooks/useCreatePin', () => ({
  useCreatePin: () => ({ createPinAsync: mockCreate }),
}));
jest.mock('~/features/pins/hooks/useUpdatePin', () => ({
  useUpdatePin: () => ({ updatePinAsync: mockUpdate }),
}));
jest.mock('~/features/pins/hooks/useDeletePin', () => ({
  useDeletePin: () => ({ deletePinAsync: mockDelete }),
}));
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: mockTransferBusy }),
}));
jest.mock('~/hooks/useSingleNavigation', () => ({
  useSingleNavigation: () => (action: () => void) => action(),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock('~/features/pins/components/PinDetails', () => ({ PinDetails: () => null }));
jest.mock('~/features/pins/components/ImageModal', () => ({ ImageModal: () => null }));
jest.mock('~/services/images/ImageManager', () => ({
  getLocalPath: () => 'file:///synthetic-photo.jpg',
  pickImage: jest.fn(),
  saveImageLocally: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));

const pin = {
  id: 'test-pin',
  name: 'Synthetic pin',
  lat: 1,
  lng: 2,
  images: ['synthetic-photo.jpg'],
  version: 1,
} as Pin;
let renderer: ReactTestRenderer;
let close: jest.Mock;
let cancel: jest.Mock;
const editor = () => <PinEditor mode="edit" pin={pin} onClose={close} onCancel={cancel} />;
const iconButton = (name: string) =>
  renderer.root
    .findAllByType(TouchableOpacity)
    .find((button) => button.findAllByProps({ name }).length)!;
const input = () => renderer.root.findAllByType(TextInput)[0];
const photoPicker = () => iconButton('image');
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
async function mount() {
  await act(async () => {
    renderer = create(editor());
  });
}
beforeEach(() => {
  mockTransferBusy = false;
  jest.clearAllMocks();
  close = jest.fn();
  cancel = jest.fn();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});

test('pin fields and photos cannot change during own save and unlock after failure', async () => {
  const operation = deferred<void>();
  mockUpdate.mockReturnValueOnce(operation.promise);
  await mount();
  await act(async () => {
    iconButton('save').props.onPress();
  });
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect(input().props.editable).toBe(false);
  expect(photoPicker().props.disabled).toBe(true);
  const remove = renderer.root.findByProps({ accessibilityLabel: 'Remove photo 1' });
  expect(remove.props.disabled).toBe(true);
  await act(async () => {
    input().props.onChangeText('Must not replace the submitted name');
    await photoPicker().props.onPress();
    remove.props.onPress();
  });
  expect(input().props.value).toBe('Synthetic pin');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Remove photo 1' })).toBeDefined();
  expect(pickImage).not.toHaveBeenCalled();
  await act(async () => {
    operation.reject(new Error('Synthetic storage failure'));
  });
  expect(input().props.editable).toBe(true);
  expect(close).not.toHaveBeenCalled();
});

test('an unrelated upload blocks pin field/photo writes but allows cancel', async () => {
  await mount();
  mockTransferBusy = true;
  await act(async () => renderer.update(editor()));
  expect(input().props.editable).toBe(false);
  expect(photoPicker().props.disabled).toBe(true);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Remove photo 1' }).props.disabled).toBe(
    true
  );
  expect(iconButton('visibility').props.disabled).toBe(false);
  await act(async () => iconButton('visibility').props.onPress());
  expect(cancel).toHaveBeenCalledTimes(1);
});

test('photo selection begun earlier cannot change the draft while save is pending', async () => {
  const selection = deferred<string>();
  const operation = deferred<void>();
  jest.mocked(pickImage).mockReturnValueOnce(selection.promise);
  mockUpdate.mockReturnValueOnce(operation.promise);
  await mount();
  let pendingSelection!: Promise<void>;
  await act(async () => {
    pendingSelection = photoPicker().props.onPress();
  });
  await act(async () => {
    iconButton('save').props.onPress();
  });
  await act(async () => {
    selection.resolve('file:///selected-later.jpg');
    await pendingSelection;
  });
  expect(saveImageLocally).not.toHaveBeenCalled();
  await act(async () => operation.resolve());
});

test('pin modal blocks dismissal only for its own save', async () => {
  const operation = deferred<void>();
  mockCreate.mockReturnValueOnce(operation.promise);
  await act(async () => {
    renderer = create(
      <PinModal mode="create" visible coords={{ lat: 1, lng: 2 }} onClose={close} />
    );
  });
  await act(async () => input().props.onChangeText('Synthetic created pin'));
  await act(async () => {
    iconButton('save').props.onPress();
  });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  await act(async () => renderer.root.findByType(ModalWrapper).props.onClose());
  expect(close).not.toHaveBeenCalled();
  await act(async () => operation.reject(new Error('Synthetic storage failure')));
  mockTransferBusy = true;
  await act(async () => {
    renderer.update(<PinModal mode="create" visible coords={{ lat: 1, lng: 2 }} onClose={close} />);
  });
  await act(async () => renderer.root.findByType(ModalWrapper).props.onClose());
  expect(close).toHaveBeenCalledTimes(1);
});

test('pin modal and fields unlock after own delete fails during an unrelated upload', async () => {
  const operation = deferred<void>();
  mockDelete.mockReturnValueOnce(operation.promise);
  await act(async () => {
    renderer = create(<PinModal mode="view" visible pin={pin} onClose={close} />);
  });
  await act(async () => renderer.root.findByType(PinDetails).props.onEdit());
  await act(async () => {
    iconButton('delete').props.onPress();
    jest
      .mocked(Alert.alert)
      .mock.calls[0][2]?.find((button) => button.text === 'Delete')
      ?.onPress?.();
  });
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(input().props.editable).toBe(false);
  await act(async () => renderer.root.findByType(ModalWrapper).props.onClose());
  expect(close).not.toHaveBeenCalled();
  await act(async () => operation.reject(new Error('Synthetic delete failure')));
  mockTransferBusy = true;
  await act(async () => {
    renderer.update(<PinModal mode="view" visible pin={pin} onClose={close} />);
  });
  expect(input().props.editable).toBe(false);
  expect(iconButton('visibility').props.disabled).toBe(false);
  await act(async () => renderer.root.findByType(ModalWrapper).props.onClose());
  expect(close).toHaveBeenCalledTimes(1);
});

test('a photo copy completing after transfer starts cannot change the draft', async () => {
  const copy = deferred<string>();
  jest.mocked(pickImage).mockResolvedValueOnce('file:///selected-photo.jpg');
  jest.mocked(saveImageLocally).mockReturnValueOnce(copy.promise);
  await mount();
  let pendingSelection!: Promise<void>;
  await act(async () => {
    pendingSelection = photoPicker().props.onPress();
  });
  expect(saveImageLocally).toHaveBeenCalledTimes(1);
  mockTransferBusy = true;
  await act(async () => renderer.update(editor()));
  await act(async () => {
    copy.resolve('new-photo.jpg');
    await pendingSelection;
  });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Remove photo 1' })).toBeDefined();
  expect(renderer.root.findAllByProps({ accessibilityLabel: 'Remove photo 2' })).toHaveLength(0);
  expect(renderer.root.findByType(PinForm).props.disabled).toBe(true);
});
