/**
 * Database Type Definitions
 *
 * Provides separate type definitions for SQLite (local) and API response (remote) schemas.
 * Remote types represent what the backend API returns.
 *
 * Local types (SQLite):
 * - Include sync tracking fields
 * - Use snake_case column names (until local migration applied)
 *
 * Remote types (API responses):
 * - Match backend API response format
 * - Used by API repositories and sync handlers
 */

import * as sqliteSchema from './schema/sqlite';

// ==================== LOCAL TYPES (SQLite) ====================
type LocalPin = typeof sqliteSchema.pins.$inferSelect;
type LocalForm = typeof sqliteSchema.forms.$inferSelect;
type LocalSyncQueueItem = typeof sqliteSchema.syncQueue.$inferSelect;

// ==================== REMOTE TYPES (API Responses) ====================
// These represent the shape of data returned by backend API
type RemotePin = {
  id: string;
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  images?: string[] | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  userId: string;
  version: number;
};

type RemoteForm = {
  id: string;
  pinId?: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  images?: string[] | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
  userId: string;
  version: number;
  // Form-specific fields
  structureType?: string;
  constructionType?: string;
  foundationType?: string;
  roofType?: string;
  wallType?: string;
  floorType?: string;
  windowType?: string;
  doorType?: string;
  electrical?: string;
  plumbing?: string;
  sanitation?: string;
  additionalNotes?: string;
};

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
