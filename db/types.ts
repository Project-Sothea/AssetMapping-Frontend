/**
 * Database Type Definitions
 *
 * Provides type definitions for SQLite (local) schemas.
 *
 * Local types (SQLite):
 * - Include sync tracking fields
 * - Use snake_case column names (until local migration applied)
 */

import * as sqliteSchema from './schema/sqlite';

// ==================== LOCAL TYPES (SQLite) ====================
export type Pin = typeof sqliteSchema.pins.$inferSelect;
export type Form = typeof sqliteSchema.forms.$inferSelect;