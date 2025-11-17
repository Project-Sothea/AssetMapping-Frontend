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
  id: text('id').primaryKey(),

  // Timestamps
  createdAt: text('createdAt')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deletedAt'), // Soft delete

  // Version for optimistic concurrency control
  version: integer('version').notNull().default(1),

  // Location
  lat: real('lat'),
  lng: real('lng'),

  // Details
  type: text('type'),
  name: text('name'),
  address: text('address'),
  cityVillage: text('cityVillage'),
  description: text('description'),

  // Images - stored as JSON string
  images: text('images'), // JSON.stringify(['url1', 'url2'])

  // Local-only fields (sync tracking)
  failureReason: text('failureReason'),
  status: text('status'),
  lastSyncedAt: text('lastSyncedAt'),
  lastFailedSyncAt: text('lastFailedSyncAt'),
  localImages: text('localImages'), // Local file paths before upload
});

/**
 * Forms table (Local SQLite)
 * Stores health assessment forms linked to pins
 */
export const forms = sqliteTable('forms', {
  // Primary identifier
  id: text('id').primaryKey(),

  // Timestamps
  createdAt: text('createdAt')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deletedAt'),

  // Version for optimistic concurrency control
  version: integer('version').notNull().default(1),

  // Relations
  pinId: text('pinId'), // Foreign key
  villageId: text('villageId'),
  name: text('name'),
  village: text('village'),

  // Health Assessment Fields (text fields)
  brushTeeth: text('brushTeeth'),
  canAttend: text('canAttend'),
  cholesterol: text('cholesterol'),
  coldLookLike: text('coldLookLike'),
  conditionDetails: text('conditionDetails'),
  diabetes: text('diabetes'),
  diarrhoea: text('diarrhoea'),
  diarrhoeaAction: text('diarrhoeaAction'),
  eatCleanFood: text('eatCleanFood'),
  handAfterToilet: text('handAfterToilet'),
  handBeforeMeal: text('handBeforeMeal'),
  haveToothbrush: text('haveToothbrush'),
  hypertension: text('hypertension'),
  knowDoctor: text('knowDoctor'),
  knowWaterFilters: text('knowWaterFilters'),
  mskInjury: text('mskInjury'),
  otherBrushTeeth: text('otherBrushTeeth'),
  otherBuyMedicine: text('otherBuyMedicine'),
  otherCondition: text('otherCondition'),
  otherLearning: text('otherLearning'),
  otherManagement: text('otherManagement'),
  otherSickAction: text('otherSickAction'),
  otherWaterFilterReason: text('otherWaterFilterReason'),
  otherWaterSource: text('otherWaterSource'),
  ownTransport: text('ownTransport'),
  povertyCard: text('povertyCard'),
  whereBuyMedicine: text('whereBuyMedicine'),

  // Health Assessment Fields (array fields - stored as JSON strings)
  cholesterolAction: text('cholesterolAction'),
  coldAction: text('coldAction'),
  diabetesAction: text('diabetesAction'),
  hypertensionAction: text('hypertensionAction'),
  longTermConditions: text('longTermConditions'),
  managementMethods: text('managementMethods'),
  mskAction: text('mskAction'),
  notUsingWaterFilter: text('notUsingWaterFilter'),
  unsafeWater: text('unsafeWater'),
  waterSources: text('waterSources'),
  whatDoWhenSick: text('whatDoWhenSick'),

  // Local-only fields (sync tracking)
  failureReason: text('failureReason'),
  status: text('status'),
  lastSyncedAt: text('lastSyncedAt'),
  lastFailedSyncAt: text('lastFailedSyncAt'),
});

/**
 * Sync Queue table (Local SQLite only - not synced to Supabase)
 * Manages background sync operations
 */
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  createdAt: text('createdAt')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  operation: text('operation').notNull(),
  entityType: text('entityType').notNull(),
  entityId: text('entityId').notNull(),
  idempotencyKey: text('idempotencyKey').notNull().unique(),
  payload: text('payload').notNull(),
  status: text('status').notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('maxAttempts').notNull().default(3),
  lastError: text('lastError'),
  lastAttemptAt: text('lastAttemptAt'),
  sequenceNumber: integer('sequenceNumber'),
  dependsOn: text('dependsOn'),
  deviceId: text('deviceId'),
});

// ==================== Inferred Types ====================
// Consolidated here to simplify imports (replacing previous db/types.ts)
export type Pin = typeof pins.$inferSelect;
export type FormDB = typeof forms.$inferSelect;

// Form represents the runtime application type with parsed arrays (string[])
// whereas FormDB has arrays as JSON strings for database storage
type ArrayFieldKeys =
  | 'longTermConditions'
  | 'managementMethods'
  | 'whatDoWhenSick'
  | 'coldAction'
  | 'mskAction'
  | 'hypertensionAction'
  | 'cholesterolAction'
  | 'diabetesAction'
  | 'waterSources'
  | 'unsafeWater'
  | 'notUsingWaterFilter';

export type Form = Omit<FormDB, ArrayFieldKeys> & {
  [K in ArrayFieldKeys]?: string[] | null;
};
