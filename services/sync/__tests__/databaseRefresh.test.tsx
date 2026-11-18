/** @jest-environment node */
import { addDatabaseChangeListener } from 'expo-sqlite';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import { db } from '~/services/drizzleDb';

import { finishSetup, runTransfer } from '../transferCoordinator';

import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }));
let listeners: ((event: {
  tableName: string;
  databaseName: string;
  databaseFilePath: string;
}) => void)[];
let renderer: ReactTestRenderer;
function Probe() {
  useFetchLocalPins();
  return null;
}
const notify = () => {
  for (const cb of listeners)
    cb({ tableName: 'pins', databaseName: 'main', databaseFilePath: '/data/SQLite/local.db' });
};
beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
  jest.useFakeTimers();
  listeners = [];
  jest.mocked(addDatabaseChangeListener).mockImplementation((cb) => {
    listeners.push(cb as never);
    return {
      remove: () => {
        listeners = listeners.filter((x) => x !== cb);
      },
    };
  });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function mount() {
  await act(async () => {
    renderer = create(<Probe />);
  });
}
function spyReads() {
  return jest.spyOn(
    (db as unknown as { session: { prepareQuery: (...args: unknown[]) => unknown } }).session,
    'prepareQuery'
  );
}

test('pin-list SQL reads coalesce closely spaced native notifications', async () => {
  await mount();
  const read = spyReads();
  await act(async () => {
    for (let i = 0; i < 50; i++) notify();
  });
  expect(read).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(100));
  expect(read).toHaveBeenCalledTimes(1);
});

test('bulk transfer defers all pin-list reads until transfer completion', async () => {
  await mount();
  const read = spyReads();
  let release!: () => void;
  let pending!: Promise<void>;
  await act(async () => {
    pending = runTransfer(
      'download',
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    for (let i = 0; i < 50; i++) notify();
    jest.advanceTimersByTime(100);
  });
  expect(read).not.toHaveBeenCalled();
  await act(async () => {
    release();
    await pending;
    jest.advanceTimersByTime(100);
  });
  expect(read).toHaveBeenCalledTimes(1);
});

test('form village follows an offline pin edit without rewriting its form', async () => {
  const { pins, forms } = require('~/db/schema');
  const { useFetchForms } = require('~/features/forms/hooks/useFetchForms');
  db.insert(pins)
    .values({
      id: 'p',
      name: 'Pin',
      lat: 12,
      lng: 103,
      createdAt: new Date(),
      cityVillage: 'Krang Svat',
    })
    .run();
  db.insert(forms)
    .values({ id: 'f', name: '', pinId: 'p', villageId: 'A1', createdAt: new Date() })
    .run();
  let observed: { pinVillage: string | null }[] = [];
  function FormsProbe() {
    observed = useFetchForms('p');
    return null;
  }
  await act(async () => {
    renderer = create(<FormsProbe />);
  });
  expect(observed[0].pinVillage).toBe('Krang Svat');
  await act(async () => {
    db.update(pins).set({ cityVillage: 'Srae Ou' }).run();
    notify();
    jest.advanceTimersByTime(100);
  });
  expect(observed[0].pinVillage).toBe('Srae Ou');
  expect(db.select().from(forms).get()).not.toHaveProperty('village');
});

test('switching form scope during a transfer never displays the previous pin forms', async () => {
  const { pins, forms } = require('~/db/schema');
  const { useFetchForms } = require('~/features/forms/hooks/useFetchForms');
  for (const id of ['a', 'b']) {
    db.insert(pins)
      .values({ id, name: id, lat: 12, lng: 103, cityVillage: 'Krang Svat', createdAt: new Date() })
      .run();
    db.insert(forms)
      .values({ id, name: id, pinId: id, villageId: id, createdAt: new Date() })
      .run();
  }
  let observed: { id: string }[] = [];
  function FormsProbe({ pinId }: { pinId: string }) {
    observed = useFetchForms(pinId);
    return null;
  }
  await act(async () => {
    renderer = create(<FormsProbe pinId="a" />);
  });
  expect(observed.map((x) => x.id)).toEqual(['a']);
  let release!: () => void;
  let pending!: Promise<void>;
  await act(async () => {
    pending = runTransfer(
      'download',
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    renderer.update(<FormsProbe pinId="b" />);
  });
  expect(observed).toEqual([]);
  await act(async () => {
    release();
    await pending;
    jest.advanceTimersByTime(100);
  });
  expect(observed.map((x) => x.id)).toEqual(['b']);
});
