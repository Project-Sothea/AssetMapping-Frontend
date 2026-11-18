/** @jest-environment node */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Modal, Text, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { pins, syncQueue } from '~/db/schema';
import { FormEditor } from '~/features/forms/components/FormEditor';
import { createForm } from '~/features/forms/services/FormService';
import { PinForm } from '~/features/pins/components/PinForm';
import { createPin as savePin, updatePin } from '~/features/pins/services/PinService';
import { db } from '~/services/drizzleDb';

import { finishSetup } from '../transferCoordinator';

import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({
  deleteImagesByFilename: jest.fn(),
  getLocalPath: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: false }),
}));
const pin = {
  id: 'p',
  name: 'Pin',
  lat: 12,
  lng: 103,
  images: [],
  address: '',
  description: '',
  type: 'normal',
  cityVillage: 'Test Village',
};
let renderer: ReactTestRenderer | undefined;
let client: QueryClient;
beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  client = new QueryClient();
});
afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount());
  renderer = undefined;
  client.clear();
});

test.each(['', '   ', 'Singapore'])(
  'new pins reject missing or unsupported village %j',
  async (cityVillage) => {
    await expect(savePin({ ...pin, cityVillage })).rejects.toThrow(/village/i);
    expect(db.select().from(pins).all()).toHaveLength(0);
  }
);

test('existing blank landmark survives unrelated edit and can later receive a village', async () => {
  db.insert(pins)
    .values({ ...pin, cityVillage: '', images: '[]', createdAt: new Date() })
    .run();
  expect((await updatePin('p', { name: 'Well' })).cityVillage).toBe('');
  expect((await updatePin('p', { cityVillage: 'Krang Svat' })).cityVillage).toBe('Krang Svat');
});

test('new forms require a village on their parent pin', async () => {
  db.insert(pins)
    .values({ ...pin, cityVillage: '', images: '[]', createdAt: new Date() })
    .run();
  await expect(
    createForm({ pinId: 'p', name: 'Patient', villageId: 'A1' } as never)
  ).rejects.toThrow(/village/i);
});

test('form writes discard legacy and read-only village fields from queued payloads', async () => {
  await savePin(pin);
  await createForm({
    pinId: 'p',
    name: 'Patient',
    villageId: 'A1',
    village: 'Wrong',
    otherVillage: 'Wrong',
    pinVillage: 'Wrong',
  } as never);
  const row = db
    .select()
    .from(syncQueue)
    .all()
    .find((row) => row.entityType === 'form')!;
  const payload = JSON.parse(row.payload);
  expect(payload).not.toHaveProperty('village');
  expect(payload).not.toHaveProperty('otherVillage');
  expect(payload).not.toHaveProperty('pinVillage');
});

test('pin creation uses five explicit dropdown options and has no address input', async () => {
  await act(async () => {
    renderer = create(
      <PinForm selectedPin={null} coords={{ lat: 12, lng: 103 }} onSubmit={() => {}} />
    );
  });
  const field = renderer!.root
    .findAllByProps({ collapsable: false })
    .find((node) => jest.isMockFunction(node.instance?.measureInWindow));
  expect(field).toBeDefined();
  field!.instance.measureInWindow.mockImplementation(
    (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(24, 220, 320, 48)
  );
  const trigger = renderer!.root.findAllByProps({
    accessibilityRole: 'button',
    accessibilityLabel: 'Village',
  })[0];
  expect(trigger).toBeDefined();
  await act(async () => {
    trigger.props.onPress();
  });
  const optionLabels = [
    ...new Set(
      renderer!.root
        .findAllByProps({ accessibilityRole: 'button' })
        .map((node) => node.props.accessibilityLabel)
        .filter((label) => label && !['Village', 'Close village list'].includes(label))
    ),
  ];
  expect(optionLabels).toEqual(['Krang Svat', 'Srae Ou', 'Svay Sor', 'Boeung Tim', 'Test Village']);
  expect(
    renderer!.root
      .findAllByType(TextInput)
      .some((node) => /address|city\/village/i.test(node.props.placeholder ?? ''))
  ).toBe(false);
});

test('pin village opens as a form choice, selects Test Village and saves without a duplicate label', async () => {
  let submit!: () => void;
  const onSubmit = jest.fn();
  await act(async () => {
    renderer = create(
      <PinForm
        selectedPin={null}
        coords={{ lat: 12, lng: 103 }}
        onSubmit={onSubmit}
        onSubmitRegister={(fn) => {
          submit = fn;
        }}
      />
    );
  });
  const text = renderer!.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat()
    .join(' ');
  expect(text).toContain('Village *');
  expect(text).not.toContain('City/Village');
  const field = renderer!.root
    .findAllByProps({ collapsable: false })
    .find((node) => jest.isMockFunction(node.instance?.measureInWindow));
  expect(field).toBeDefined();
  field!.instance.measureInWindow.mockImplementation(
    (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(24, 220, 320, 48)
  );
  const trigger = renderer!.root.findAllByProps({
    accessibilityRole: 'button',
    accessibilityLabel: 'Village',
  })[0];
  expect(trigger).toBeDefined();
  await act(async () => {
    trigger.props.onPress();
  });
  expect(renderer!.root.findAllByType(Modal).some((node) => node.props.visible)).toBe(true);
  const choice = renderer!.root.findAllByProps({
    accessibilityRole: 'button',
    accessibilityLabel: 'Test Village',
  })[0];
  expect(choice).toBeDefined();
  await act(async () => {
    choice.props.onPress();
  });
  expect(
    renderer!.root.findAllByProps({
      accessibilityRole: 'button',
      accessibilityLabel: 'Test Village',
    }).length > 0
  ).toBe(false);
  await act(async () => {
    renderer!.root
      .findAllByType(TextInput)
      .find((node) => node.props.placeholder === 'Enter name')!
      .props.onChangeText('Village picker test');
  });
  await act(async () => {
    await submit();
  });
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ cityVillage: 'Test Village' }));
});

test('form UI does not ask which village the respondent is from', async () => {
  await act(async () => {
    renderer = create(
      <QueryClientProvider client={client}>
        <FormEditor pinId="p" selectedForm={null} isEditing onClose={() => {}} />
      </QueryClientProvider>
    );
  });
  expect(
    renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat()
      .join(' ')
  ).not.toContain('Which village are you from?');
});

test('editing a legacy NULL-village pin in the UI preserves its blank village and address', async () => {
  let submit!: () => void;
  const onSubmit = jest.fn();
  await act(async () => {
    renderer = create(
      <PinForm
        selectedPin={{ ...pin, cityVillage: null, address: 'Preserve legacy address' }}
        onSubmit={onSubmit}
        onSubmitRegister={(fn) => {
          submit = fn;
        }}
      />
    );
  });
  await act(async () => {
    await submit();
  });
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ cityVillage: '', address: 'Preserve legacy address' })
  );
});

test('mobile village choices match the backend contract without a runtime package dependency', () => {
  const { VILLAGES } = require('~/shared/constants/villages');
  expect(VILLAGES).toEqual(require('@assetmapping/shared-types/villages').PIN_VILLAGES);
});
