// db/index.ts
import * as SQLite from 'expo-sqlite';
import { drizzle as drizzleSqlite } from 'drizzle-orm/expo-sqlite';
import { forms, pins } from '~/db/schema/sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '../drizzle/sqlite/migrations';

//Local DB
const DATABASE_NAME = 'local.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzleSqlite(expoDb, { schema: { pins, forms } }); //add in a casing: 'snake_case'

export function useRunMigrations() {
  return useMigrations(db, migrations);
}
