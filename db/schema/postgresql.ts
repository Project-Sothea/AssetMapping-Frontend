/**
 * PostgreSQL Schema (Supabase Remote Database)
 *
 * This schema defines the remote PostgreSQL/Supabase database structure.
 * Uses builder functions from shared.ts for single source of truth.
 *
 * **UNIFIED FORMAT**: Uses camelCase column names and JSON strings for arrays
 * to match local SQLite format - no conversion needed during sync!
 *
 * Features:
 * - Common fields (synced with local SQLite) via builders
 * - NO local-only fields (no sync tracking in remote)
 * - NO sync queue (local only)
 * - camelCase column names (JavaScript/TypeScript convention)
 * - Arrays as JSON strings (TEXT) for unified format
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

  // Images - stored as JSON string for unified format
  images: text('images'),
});

/**
 * Forms table (PostgreSQL/Supabase)
 * Stores health assessment forms - synced from local SQLite
 */
export const forms = pgTable('forms', {
  // Common fields from builder
  ...buildCommonFormFields(text, timestamp),

  // Array fields - stored as JSON strings for unified format
  ...buildFormArrayFields(text),
});

// Export types for use in repositories
export type Pin = typeof pins.$inferSelect;
export type InsertPin = typeof pins.$inferInsert;

export type Form = typeof forms.$inferSelect;
export type InsertForm = typeof forms.$inferInsert;
