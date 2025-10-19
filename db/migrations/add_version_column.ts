/**
 * Migration: Add version column to pins and forms tables
 *
 * This migration adds the `version` column to both pins and forms tables
 * for optimistic concurrency control.
 *
 * Run this migration before using the new simplified sync logic.
 *
 * Usage:
 * ```typescript
 * import { migrateAddVersionColumn } from './db/migrations/add_version_column';
 * await migrateAddVersionColumn();
 * ```
 */

import * as SQLite from 'expo-sqlite';

/**
 * Add version column to pins and forms tables
 * @param databaseName - Name of the database file (defaults to 'local.db')
 */
export async function migrateAddVersionColumn(databaseName: string = 'local.db') {
  console.log('🔄 Starting migration: Add version column');

  const db = await SQLite.openDatabaseAsync(databaseName);

  try {
    // Check if pins table exists
    const tables = (await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='pins';"
    )) as { name: string }[];

    if (tables.length === 0) {
      console.log('  ⊘ Pins table does not exist yet, skipping migration');
      console.log('  ℹ️  This migration will run after Drizzle creates the tables');
      return { success: false, reason: 'tables_not_created' };
    }

    // Check if version column already exists in pins
    const pinsColumns = (await db.getAllAsync('PRAGMA table_info(pins);')) as { name: string }[];

    const pinsHasVersion = pinsColumns.some((col) => col.name === 'version');

    if (!pinsHasVersion) {
      console.log('  Adding version column to pins...');
      await db.execAsync('ALTER TABLE pins ADD COLUMN version INTEGER NOT NULL DEFAULT 1;');
      console.log('  ✓ Added version column to pins');
    } else {
      console.log('  ⊘ Version column already exists in pins, skipping');
    }

    // Check if forms table exists
    const formsTables = (await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='forms';"
    )) as { name: string }[];

    if (formsTables.length > 0) {
      // Check if version column already exists in forms
      const formsColumns = (await db.getAllAsync('PRAGMA table_info(forms);')) as {
        name: string;
      }[];

      const formsHasVersion = formsColumns.some((col) => col.name === 'version');

      if (!formsHasVersion) {
        console.log('  Adding version column to forms...');
        await db.execAsync('ALTER TABLE forms ADD COLUMN version INTEGER NOT NULL DEFAULT 1;');
        console.log('  ✓ Added version column to forms');
      } else {
        console.log('  ⊘ Version column already exists in forms, skipping');
      }
    } else {
      console.log('  ⊘ Forms table does not exist yet, skipping forms migration');
    }

    console.log('✅ Migration complete: Version columns added');
    return { success: true };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration (remove version columns)
 * Note: SQLite doesn't support DROP COLUMN directly,
 * so this requires recreating tables
 */
export async function rollbackVersionColumn() {
  console.log('⚠️  Rolling back version column migration...');
  console.log('⚠️  Note: SQLite requires table recreation for column removal');
  console.log('⚠️  This is a destructive operation and should only be used in development');

  // Not implemented - SQLite doesn't support DROP COLUMN
  throw new Error('Rollback not implemented - SQLite does not support DROP COLUMN');
}
