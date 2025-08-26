// db/index.ts
import * as SQLite from 'expo-sqlite';
import { drizzle as drizzleSqlite } from 'drizzle-orm/expo-sqlite';
import { forms, pins } from 'db/schema';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from 'drizzle/migrations';
import { PgTable } from 'drizzle-orm/pg-core';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableColumns, SQL, sql } from 'drizzle-orm';

//Local DB
const DATABASE_NAME = 'local.db';

const expoDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
export const db = drizzleSqlite(expoDb, { schema: { pins, forms } }); //add in a casing: 'snake_case'

export function useRunMigrations() {
  return useMigrations(db, migrations);
}

//custom functions
export function buildUpsertSet<Table extends Record<string, any>>(
  table: Table,
  excludedCols: (keyof Table)[] = []
): Record<keyof Table, SQL> {
  const columns = Object.keys(table) as (keyof Table)[];
  const set = columns
    .filter((col) => !excludedCols.includes(col))
    .reduce(
      (acc, col) => {
        const columnName = (table[col] as any).name;
        acc[col] = sql.raw(`excluded.${columnName}`);
        return acc;
      },
      {} as Record<keyof Table, SQL>
    );

  return set;

  // for (const key in table) {
  //     //if excludedCols, then dont add to set
  //     if (!excludedCols.includes(key)) {
  //       set[key as keyof Table] = sql.raw(`excluded.${colName}`);
  //     }
  // }
}

export function buildSoftDeleteSet<T extends Record<string, any>>(
  table: T,
  exclude: (keyof T)[],
  systemOverrides: Partial<Record<keyof T, any>> = {}
) {
  const set: Record<string, any> = {};

  for (const col of Object.keys(table)) {
    if (exclude.includes(col as keyof T)) continue;
    set[col] = null; // default nullify
  }

  return {
    ...set,
    ...systemOverrides,
  };
}

export const buildConflictUpdateColumns = <
  T extends PgTable | SQLiteTable,
  Q extends keyof T['_']['columns'],
>(
  table: T,
  columns: Q[]
) => {
  const cls = getTableColumns(table);
  return columns.reduce(
    (acc, column) => {
      const colName = cls[column].name;
      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>
  );
};
