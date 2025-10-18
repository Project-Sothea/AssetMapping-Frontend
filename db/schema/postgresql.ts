/**
 * PostgreSQL Schema (Supabase Remote Database)
 *
 * This schema defines the remote PostgreSQL/Supabase database structure.
 * Uses builder functions from shared.ts for single source of truth.
 *
 * Features:
 * - Common fields (synced with local SQLite) via builders
 * - NO local-only fields (no sync tracking in remote)
 * - NO sync queue (local only)
 * - Native PostgreSQL arrays (text[])
 * - UUID and TIMESTAMP WITH TIME ZONE types
 */

import { pgTable, text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
import { buildCommonPinFields, buildCommonFormFields, buildFormArrayFields } from './shared';

/**
 * Pins table (PostgreSQL/Supabase)
 * Stores location pins - synced from local SQLite
 */
export const pins = pgTable('pins', {
  // Common fields from builder
  ...buildCommonPinFields(text, doublePrecision, timestamp),

  // Images - native PostgreSQL array
  images: text('images').array(),
});

/**
 * Forms table (PostgreSQL/Supabase)
 * Stores health assessment forms - synced from local SQLite
 */
export const forms = pgTable('forms', {
  // Common fields from builder
  ...buildCommonFormFields(text, timestamp),

  // Array fields - native PostgreSQL arrays
  ...buildFormArrayFields((col: string) => text(col).array()),
});

// Export types for use in repositories
export type Pin = typeof pins.$inferSelect;
export type InsertPin = typeof pins.$inferInsert;

export type Form = typeof forms.$inferSelect;
export type InsertForm = typeof forms.$inferInsert;
