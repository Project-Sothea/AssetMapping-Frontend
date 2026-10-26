import type { Form } from '@assetmapping/shared-types';
import React from 'react';
import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { FormEditor } from '~/features/forms/components/FormEditor';
import GeneralSection from '~/features/forms/components/GeneralSection';

let mockTransferBusy = false;
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
jest.mock('~/features/forms/hooks/useCreateForm', () => ({
  useCreateForm: () => ({ createFormAsync: mockCreate }),
}));
jest.mock('~/features/forms/hooks/useUpdateForm', () => ({
  useUpdateForm: () => ({ updateFormAsync: mockUpdate }),
}));
jest.mock('~/features/forms/hooks/useDeleteForm', () => ({
  useDeleteForm: () => ({ deleteFormAsync: mockDelete }),
}));
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: mockTransferBusy }),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));

const selectedForm = {
  id: 'test-form',
  pinId: 'test-pin',
  version: 1,
  name: 'Synthetic test',
  age: null,
  village: 'Krang Svat',
  villageId: '',
  dataCollectionDate: '22 May 2026',
} as Form;
let renderer: ReactTestRenderer;
let close: jest.Mock;
let guard: (() => void) | null;
let editing: boolean;
const setGuard = (next: (() => void) | null) => {
  guard = next;
};

const editor = () => (
  <FormEditor
    pinId="test-pin"
    selectedForm={selectedForm}
    isEditing={editing}
    onClose={close}
    onCloseGuardChange={setGuard}
  />
);
async function mount(isEditing = false) {
  editing = isEditing;
  await act(async () => {
    renderer = create(editor());
  });
}
async function setTransferBusy(next: boolean) {
  mockTransferBusy = next;
  await act(async () => renderer.update(editor()));
}
async function makeDirty() {
  await act(async () => {
    renderer.root.findAllByType(GeneralSection)[0].props.setFieldValue('name', 'Edited test');
  });
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function discard() {
  const calls = jest.mocked(Alert.alert).mock.calls;
  return calls
    .find((call) => call[0] === 'Discard unsaved changes?')?.[2]
    ?.find((action) => action.text === 'Discard');
}

beforeEach(() => {
  mockTransferBusy = false;
  jest.clearAllMocks();
  close = jest.fn();
  guard = null;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});

test('read-only form can dismiss while an unrelated upload is busy', async () => {
  await mount();
  await setTransferBusy(true);
  await act(async () => guard?.());
  expect(close).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('dirty form still offers discard while an unrelated upload is busy', async () => {
  await mount(true);
  await makeDirty();
  await setTransferBusy(true);
  await act(async () => guard?.());
  expect(close).not.toHaveBeenCalled();
  expect(discard()).toBeDefined();
  await act(async () => discard()?.onPress?.());
  expect(close).toHaveBeenCalledTimes(1);
});

test('switching a dirty form to view mode cannot bypass discard confirmation', async () => {
  await mount(true);
  await makeDirty();
  editing = false;
  await act(async () => renderer.update(editor()));
  await act(async () => guard?.());
  expect(close).not.toHaveBeenCalled();
  expect(discard()).toBeDefined();
});

test('unrelated upload still blocks field writes, save and delete', async () => {
  await mount(true);
  await setTransferBusy(true);
  await makeDirty();
  expect(renderer.root.findAllByType(GeneralSection)[0].props.values.name).toBe('Synthetic test');
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
    renderer.root.findByProps({ accessibilityLabel: 'Delete form' }).props.onPress();
  });
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();
});

test.each(['save', 'delete'] as const)(
  'own %s prevents dismissal, then releases it after failure even if another upload starts',
  async (action) => {
    const operation = deferred();
    (action === 'save' ? mockUpdate : mockDelete).mockReturnValueOnce(operation.promise);
    await mount(true);
    if (action === 'save') await makeDirty();
    let pending!: Promise<void>;
    await act(async () => {
      if (action === 'save') {
        pending = renderer.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
        await Promise.resolve();
        await Promise.resolve();
      } else {
        renderer.root.findByProps({ accessibilityLabel: 'Delete form' }).props.onPress();
        const confirmation = jest.mocked(Alert.alert).mock.calls[0][2];
        pending = confirmation
          ?.find((button) => button.text === 'Delete')
          ?.onPress?.() as unknown as Promise<void>;
      }
    });
    expect(action === 'save' ? mockUpdate : mockDelete).toHaveBeenCalledTimes(1);
    await act(async () => guard?.());
    expect(close).not.toHaveBeenCalled();
    expect(discard()).toBeUndefined();
    await setTransferBusy(true);
    await act(async () => {
      operation.reject(new Error('Synthetic storage failure'));
      await pending;
    });
    await act(async () => guard?.());
    if (action === 'save') {
      expect(discard()).toBeDefined();
      await act(async () => discard()?.onPress?.());
    }
    expect(close).toHaveBeenCalledTimes(1);
  }
);
