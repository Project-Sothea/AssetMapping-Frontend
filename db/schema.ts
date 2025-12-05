/**
 * SQLite Schema (Local Database)
 *
 * This schema defines the local SQLite database structure using Drizzle ORM.
 *
 * Features:
 * - Pins table: location pins with health facility/community information
 * - Forms table: health assessment forms linked to pins
 * - Sync queue table: manages background sync operations (local only)
 * - Array fields stored as JSON strings (SQLite doesn't have native arrays)
 * - Sync tracking fields for offline-first functionality
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

/**
 * Pins table (Local SQLite)
 * Stores location pins with health facility/community information
 */
export const pins = sqliteTable('pins', {
  // Primary identifier
  id: text().primaryKey(),

  // Timestamps
  createdAt: text()
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`),

  // Version for optimistic concurrency control
  version: integer('version').notNull().default(1),

  // Location
  lat: real(),
  lng: real(),

  // Details
  type: text(),
  name: text(),
  address: text(),
  cityVillage: text(),
  description: text(),

  // Images - stored as JSON array of filenames (UUIDs)
  images: text(),

  // Local-only field (sync status)
  status: text(),
});

/**
 * Forms table (Local SQLite)
 * Stores health assessment forms linked to pins
 */
export const forms = sqliteTable('forms', {
  // Metadata
  id: text().primaryKey(),
  createdAt: text()
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer().notNull().default(1),
  pinId: text().references(() => pins.id, { onDelete: 'cascade' }), // Foreign key with cascade

  // General
  villageId: text(),
  name: text(),
  gender: text(),
  age: integer(),
  village: text(),
  canAttendHealthScreening: integer({ mode: 'boolean' }),

  // Health
  longTermConditions: text(),
  otherLongTermConditions: text(),
  managementMethods: text(),
  otherManagementMethods: text(),
  conditionDifficultyReasons: text(),
  otherConditionDifficultyReasons: text(),
  selfCareActions: text(),
  otherSelfCareActions: text(),
  knowWhereToFindDoctor: text(),
  otherKnowWhereToFindDoctor: text(),
  transportToClinic: text(),
  otherTransportToClinic: text(),
  medicinePurchaseLocations: text(),
  otherMedicinePurchaseLocations: text(),
  povertyCardSchemeAwareness: text(),
  otherPovertyCardSchemeAwareness: text(),
  povertyCardNonUseReasons: text(),
  toothBrushingFrequency: text(),
  otherToothBrushingFrequency: text(),
  toothbrushAndToothpasteSource: text(),
  noToothbrushOrToothpasteReasons: text(),
  otherNoToothbrushOrToothpasteReasons: text(),

  // Education
  diarrhoeaDefinition: text(),
  otherDiarrhoeaDefinition: text(),
  diarrhoeaActions: text(),
  otherDiarrhoeaActions: text(),
  commonColdSymptoms: text(),
  otherCommonColdSymptoms: text(),
  commonColdActions: text(),
  otherCommonColdActions: text(),
  mskInjuryDefinition: text(),
  otherMskInjuryDefinition: text(),
  mskInjuryActions: text(),
  otherMskInjuryActions: text(),
  hypertensionDefinition: text(),
  otherHypertensionDefinition: text(),
  hypertensionActions: text(),
  otherHypertensionActions: text(),
  healthyFoodFrequency: text(),
  otherHealthyFoodFrequency: text(),
  unhealthyFoodReasons: text(),
  otherUnhealthyFoodReasons: text(),
  highCholesterolDefinition: text(),
  otherHighCholesterolDefinition: text(),
  highCholesterolActions: text(),
  otherHighCholesterolActions: text(),
  diabetesDefinition: text(),
  otherDiabetesDefinition: text(),
  diabetesActions: text(),
  otherDiabetesActions: text(),
  otherLearningAreas: text(),

  // Water
  waterSources: text(),
  otherWaterSources: text(),
  unsafeWaterTypes: text(),
  otherUnsafeWaterTypes: text(),
  waterFilterAwareness: text(),
  otherWaterFilterAwareness: text(),
  waterFilterNonUseReasons: text(),
  otherWaterFilterNonUseReasons: text(),
  handwashingAfterToilet: text(),
  otherHandwashingAfterToilet: text(),

  // Local-only field (sync status)
  status: text(),
});

/**
 * Sync Queue table (Local SQLite only - not synced to Supabase)
 * Manages background sync operations
 */
export const syncQueue = sqliteTable('sync_queue', {
  id: text().primaryKey(),
  createdAt: text()
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  operation: text().notNull(),
  entityType: text().notNull(),
  entityId: text().notNull(),
  idempotencyKey: text().notNull().unique(),
  payload: text().notNull(),
  status: text().notNull(),
  attempts: integer().notNull().default(0),
  maxAttempts: integer().notNull().default(3),
  lastError: text(),
  lastAttemptAt: text(),
  sequenceNumber: integer(),
  dependsOn: text(),
  deviceId: text(),
});

// ==================== Inferred Types ====================
// Consolidated here to simplify imports (replacing previous db/types.ts)
export type PinDB = typeof pins.$inferSelect;
export type FormDB = typeof forms.$inferSelect;

// Form represents the runtime application type with parsed arrays (string[])
// whereas FormDB has arrays as JSON strings for database storage
type ArrayFieldKeys =
  | 'longTermConditions'
  | 'managementMethods'
  | 'conditionDifficultyReason'
  | 'selfCareActions'
  | 'noToothbrushOrToothpasteReason'
  | 'diarrhoeaDefinition'
  | 'diarrhoeaActions'
  | 'commonColdSymptoms'
  | 'commonColdActions'
  | 'mskInjuryDefinition'
  | 'mskInjuryActions'
  | 'hypertensionDefinition'
  | 'hypertensionActions'
  | 'unhealthyFoodReason'
  | 'highCholesterolDefinition'
  | 'highCholesterolActions'
  | 'diabetesDefinition'
  | 'diabetesActions'
  | 'waterSources'
  | 'unsafeWaterTypes'
  | 'waterFilterNonUseReasons';

export type Form = Omit<FormDB, ArrayFieldKeys> & {
  [K in ArrayFieldKeys]?: string[] | null;
};

// Pin represents the runtime application type with parsed images (string[])
// whereas PinDB has images as JSON strings for database storage
export type Pin = Omit<PinDB, 'images'> & { images?: string[] | null };
