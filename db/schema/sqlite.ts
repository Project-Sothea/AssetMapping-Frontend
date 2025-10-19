/**
 * SQLite Schema (Local Database)
 *
 * This schema defines the local SQLite database structure using Drizzle ORM.
 * Uses builder functions from shared.ts for single source of truth.
 *
 * Features:
 * - Common fields (synced with Supabase) via builders
 * - Local-only fields (sync tracking) via builders
 * - Sync queue table (local only)
 * - Array fields stored as JSON strings (SQLite doesn't have native arrays)
 */

import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import {
  buildCommonPinFields,
  buildPinLocalFields,
  buildCommonFormFields,
  buildFormArrayFields,
  buildFormLocalFields,
  buildSyncQueueFields,
} from './shared';

/**
 * Pins table (Local SQLite)
 * Stores location pins with health facility/community information
 */
export const pins = sqliteTable('pins', {
  // Common fields from builder (timestamps, location, details, version)
  ...buildCommonPinFields(text, real, undefined, integer),

  // Local-only fields (sync tracking)
  ...buildPinLocalFields(text),

  // Images - stored as JSON string in SQLite
  images: text('images'), // JSON.stringify(['url1', 'url2'])
});

/**
 * Forms table (Local SQLite)
 * Stores health assessment forms linked to pins
 */
export const forms = sqliteTable('forms', {
  // Common fields from builder (timestamps, relations, text fields, version)
  ...buildCommonFormFields(text, undefined, integer),

  // Array fields - stored as JSON strings (unified format)
  ...buildFormArrayFields(text),

  // Local-only fields (sync tracking)
  ...buildFormLocalFields(text),
});

/**
 * Sync Queue table (Local SQLite only - not synced to Supabase)
 * Manages background sync operations
 */
export const syncQueue = sqliteTable('sync_queue', {
  ...buildSyncQueueFields(text, integer),
});

// Export types for use in repositories
export type Pin = typeof pins.$inferSelect;
export type InsertPin = typeof pins.$inferInsert;

export type Form = typeof forms.$inferSelect;
export type InsertForm = typeof forms.$inferInsert;

export type SyncQueueItem = typeof syncQueue.$inferSelect;
export type InsertSyncQueueItem = typeof syncQueue.$inferInsert;
