/** @jest-environment node */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { forms } from '~/db/schema';
import { FormEditor } from '~/features/forms/components/FormEditor';
import GeneralSection from '~/features/forms/components/GeneralSection';
import { getFormById } from '~/features/forms/services/FormService';
import { db } from '~/services/drizzleDb';

import { finishSetup } from '../transferCoordinator';

import { createForm, createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({ deleteImagesByFilename: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: false }),
}));

let renderer: ReactTestRenderer;
let client: QueryClient;
let close: jest.Mock;
beforeAll(initializeTestDb);
beforeEach(async () => {
  resetTestDb();
  finishSetup();
  await createPin({ id: 'parent', name: 'Test pin', lat: 1, lng: 2 });
  close = jest.fn();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  client.clear();
  jest.restoreAllMocks();
});

async function mount(pinId: string = 'parent') {
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={client}>
        <FormEditor pinId={pinId} selectedForm={null} isEditing onClose={close} />
      </QueryClientProvider>
    );
  });
  await act(async () => {
    renderer.root.findAllByType(GeneralSection)[0].props.setFieldValue('village', 'Krang Svat');
  });
}

async function setHiddenPinId(value: unknown) {
  await act(async () => {
    renderer.root.findAllByType(GeneralSection)[0].props.setFieldValue('pinId', value);
  });
}

async function save() {
  await act(async () => {
    const button = renderer.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.findAllByProps({ name: 'save' }).length > 0)!;
    await button.props.onPress();
  });
}

test.each([undefined, null, '', 'different-pin'])(
  'new form binds to the open pin when hidden form pinId is %s',
  async (hiddenId) => {
    await mount();
    await setHiddenPinId(hiddenId);
    await save();
    expect(db.select().from(forms).all()).toEqual([
      expect.objectContaining({ pinId: 'parent', village: 'Krang Svat' }),
    ]);
    expect(close).toHaveBeenCalledTimes(1);
  }
);

test('missing screen context cannot be replaced by a stale hidden pinId', async () => {
  await mount(undefined as unknown as string);
  // An explicit missing prop is required; mount's default argument would otherwise restore it.
  await act(async () => {
    renderer.update(
      <QueryClientProvider client={client}>
        <FormEditor
          pinId={undefined as unknown as string}
          selectedForm={null}
          isEditing
          onClose={close}
        />
      </QueryClientProvider>
    );
  });
  await act(async () => {
    renderer.root.findAllByType(GeneralSection)[0].props.setFieldValue('village', 'Krang Svat');
  });
  await setHiddenPinId('parent');
  await save();
  expect(db.select().from(forms).all()).toHaveLength(0);
  expect(close).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Error', expect.stringMatching(/reopen.*pin/i));
});

test('existing form keeps its original parent despite stale screen and hidden IDs', async () => {
  const saved = await createForm({
    pinId: 'parent',
    name: 'Test',
    dataCollectionDate: '22 May 2026',
    villageId: '',
    village: 'Krang Svat',
  });
  const selected = await getFormById(saved.id);
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={client}>
        <FormEditor pinId="different-pin" selectedForm={selected} isEditing onClose={close} />
      </QueryClientProvider>
    );
  });
  await setHiddenPinId(undefined);
  await save();
  expect(db.select().from(forms).all()).toEqual([
    expect.objectContaining({ id: saved.id, pinId: 'parent' }),
  ]);
  expect(close).toHaveBeenCalledTimes(1);
});
