// db/index.ts
import { drizzle as drizzleSqlite } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { forms, pins } from '~/db/schema';

import migrations from '../drizzle/migrations';
//Local DB
const DATABASE_NAME = 'local.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzleSqlite(expoDb, { schema: { pins, forms } });
export function useRunMigrations() {
  const result = useMigrations(db, migrations);
  const [foreignKeysReady, setForeignKeysReady] = useState(false);
  const [foreignKeyError, setForeignKeyError] = useState<Error>();
  useEffect(() => {
    if (!result.success) return;
    try {
      // Historical table rebuilds run first. PRAGMA is ineffective inside a transaction.
      expoDb.execSync('PRAGMA foreign_keys = ON');
      if (
        expoDb.getFirstSync<{ foreign_keys: number }>('PRAGMA foreign_keys')?.foreign_keys !== 1
      ) {
        throw new Error('Foreign-key protection could not be enabled. Retry database setup.');
      }
      setForeignKeysReady(true);
    } catch (failure) {
      setForeignKeyError(failure instanceof Error ? failure : new Error(String(failure)));
    }
  }, [result.success]);
  return {
    ...result,
    success: result.success && foreignKeysReady,
    error: result.error ?? foreignKeyError,
  };
}
