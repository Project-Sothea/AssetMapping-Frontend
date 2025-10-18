/**
 * Database Type Definitions
 *
 * Provides separate type definitions for SQLite (local) and PostgreSQL (remote) schemas.
 * After migration, remote PostgreSQL uses camelCase while local SQLite still uses snake_case.
 *
 * Local types (SQLite):
 * - Include sync tracking fields
 * - Use snake_case column names (until local migration applied)
 *
 * Remote types (PostgreSQL):
 * - Exclude sync tracking fields
 * - Use camelCase column names (after PostgreSQL migration)
 */

import * as sqliteSchema from './schema/sqlite';
import * as postgresqlSchema from './schema/postgresql';

// ==================== LOCAL TYPES (SQLite) ====================
export type LocalPin = typeof sqliteSchema.pins.$inferSelect;
export type LocalForm = typeof sqliteSchema.forms.$inferSelect;
export type LocalSyncQueueItem = typeof sqliteSchema.syncQueue.$inferSelect;

// ==================== REMOTE TYPES (PostgreSQL) ====================
export type RemotePin = typeof postgresqlSchema.pins.$inferSelect;
export type RemoteForm = typeof postgresqlSchema.forms.$inferSelect;

// ==================== ALIASES ====================
// Default exports use local types (for most app code)
export type Pin = LocalPin;
export type Form = LocalForm;
export type SyncQueueItem = LocalSyncQueueItem;

// Remote types with clear names
export type RePin = RemotePin;
export type ReForm = RemoteForm;

// Insert types
export type InsertPin = typeof sqliteSchema.pins.$inferInsert;
export type InsertForm = typeof sqliteSchema.forms.$inferInsert;
export type InsertSyncQueueItem = typeof sqliteSchema.syncQueue.$inferInsert;

export type InsertRemotePin = typeof postgresqlSchema.pins.$inferInsert;
export type InsertRemoteForm = typeof postgresqlSchema.forms.$inferInsert;
