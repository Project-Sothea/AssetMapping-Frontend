// db/index.ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';

import { forms, pins } from '~/db/schema';

import migrations from '../drizzle/migrations';
//Local DB
const DATABASE_NAME = 'local.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzleSqlite(expoDb, { schema: { pins, forms } });
export function useRunMigrations() {
  return useMigrations(db, migrations);
}
