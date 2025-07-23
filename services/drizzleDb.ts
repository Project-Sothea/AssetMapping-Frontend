// db/index.ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { pins } from 'db/schema';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from 'drizzle/migrations';

const DATABASE_NAME = 'local.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzle(expoDb, { schema: { pins } }); //add in a casing: 'snake_case'

export function useRunMigrations() {
  return useMigrations(db, migrations);
}
