/** @jest-environment node */
import React from 'react';
import { act, create } from 'react-test-renderer';

import { useRunMigrations } from '~/services/drizzleDb';

let mockMigrationsReady = false;
const mockExec = jest.fn();
jest.mock('drizzle-orm/expo-sqlite', () => ({ drizzle: () => ({}) }));
jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({
  useMigrations: () => ({ success: mockMigrationsReady, error: undefined }),
}));
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: (...args: unknown[]) => mockExec(...args),
    getFirstSync: () => ({ foreign_keys: 1 }),
  }),
}));

test('foreign keys are enabled only after bundled migrations and before editors are exposed', async () => {
  let observed!: ReturnType<typeof useRunMigrations>;
  function Probe() {
    observed = useRunMigrations();
    return null;
  }
  let renderer!: ReturnType<typeof create>;
  await act(async () => {
    renderer = create(<Probe />);
  });
  expect(observed.success).toBe(false);
  expect(mockExec).not.toHaveBeenCalled();
  mockMigrationsReady = true;
  await act(async () => renderer.update(<Probe />));
  expect(mockExec).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
  expect(observed.success).toBe(true);
  await act(async () => renderer.unmount());
});
