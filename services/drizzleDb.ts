// db/index.ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';

import { forms, pins } from '~/db/schema';

import migrations from '../drizzle/migrations';

import { getLocalUpgradeError } from './localUpgradeGuard';
//Local DB
const DATABASE_NAME = 'local.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
expoDb.execSync(
  'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;'
);
export const db = drizzleSqlite(expoDb, { schema: { pins, forms } });
const upgradeError = getLocalUpgradeError(expoDb);
function useNormalMigrations() {
  return useMigrations(db, migrations);
}
function useBlockedMigrations() {
  return { success: false, error: upgradeError };
}
const useAllowedMigrations = upgradeError ? useBlockedMigrations : useNormalMigrations;
export function useRunMigrations() {
  return useAllowedMigrations();
}
