/** @jest-environment node */
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { pins, syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

import { finishSetup } from '../transferCoordinator';

import { createPin } from './fixtures';
import { initializeTestDb, resetTestDb } from './testDb';

jest.mock('~/services/drizzleDb', () => require('./testDb'));
jest.mock('~/services/images/ImageManager', () => ({ deleteImagesByFilename: jest.fn() }));
beforeAll(initializeTestDb);
beforeEach(() => {
  resetTestDb();
  finishSetup();
});

test('actual Drizzle migration rollback and retry on the same SQLite connection preserve saved records', async () => {
  await createPin({ id: 'saved', name: 'Local response', lat: 1, lng: 2 });
  const config = {
    journal: {
      entries: [{ idx: 0, when: 4102444800000, tag: 'recovery_probe', breakpoints: true }],
    },
    migrations: {
      m0000:
        'CREATE TABLE recovery_probe (value TEXT);--> statement-breakpoint INSERT INTO missing_probe_table VALUES (1);',
    },
  };
  await expect(migrate(db as unknown as Parameters<typeof migrate>[0], config)).rejects.toThrow();
  expect(
    db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE name = 'recovery_probe'")
  ).toHaveLength(0);
  expect(db.select().from(pins).get()?.name).toBe('Local response');
  expect(db.select().from(syncQueue).get()?.status).toBe('pending');
  config.migrations.m0000 =
    "CREATE TABLE recovery_probe (value TEXT);--> statement-breakpoint INSERT INTO recovery_probe VALUES ('recovered');";
  await migrate(db as unknown as Parameters<typeof migrate>[0], config);
  await migrate(db as unknown as Parameters<typeof migrate>[0], config);
  expect(db.all<{ value: string }>('SELECT value FROM recovery_probe')).toEqual([
    { value: 'recovered' },
  ]);
  expect(db.select().from(pins).get()?.name).toBe('Local response');
  expect(db.select().from(syncQueue).get()?.status).toBe('pending');
});
