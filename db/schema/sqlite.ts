/**
 * SQLite Schema (Local Database)
 *
 * This schema defines the local SQLite database structure using Drizzle ORM.
 * It includes:
 * - Common fields (synced with Supabase)
 * - Local-only fields (sync tracking, local state)
 * - camelCase naming convention (TypeScript/JavaScript style)
 * - Array fields stored as JSON strings (SQLite doesn't have native arrays)
 */

import { sql } from 'drizzle-orm';
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

/**
 * Pins table (Local SQLite)
 * Stores location pins with health facility/community information
 */
export const pins = sqliteTable('pins', {
  // Primary identifier
  id: text('id').primaryKey(), // UUID

  // Timestamps
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),

  // Local-only fields (not synced to Supabase)
  failureReason: text('failure_reason'),
  status: text('status'),
  lastSyncedAt: text('last_synced_at'),
  lastFailedSyncAt: text('last_failed_sync_at'),

  // Location data
  lat: real('lat'),
  lng: real('lng'),

  // Details
  type: text('type'),
  name: text('name'),
  address: text('address'),
  city_village: text('city/village'),
  description: text('description'),

  // Images - stored as JSON string in SQLite
  images: text('images'), // JSON.stringify(['url1', 'url2'])
  localImages: text('local_images'), // Local file paths before upload
});

/**
 * Forms table (Local SQLite)
 * Stores health assessment forms linked to pins
 */
export const forms = sqliteTable('forms', {
  // Primary identifier
  id: text('id').primaryKey(), // UUID

  // Timestamps
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),

  // Local-only fields (not synced to Supabase)
  failureReason: text('failure_reason'),
  status: text('status'),
  lastSyncedAt: text('last_synced_at'),
  lastFailedSyncAt: text('last_failed_sync_at'),

  // Relations
  pinId: text('pin_id'),
  villageId: text('village_id'),
  village: text('village'),

  // Health Assessment Fields (single-value text fields)
  brushTeeth: text('brush_teeth'),
  canAttend: text('can_attend'),
  cholesterol: text('cholesterol'),
  coldLookLike: text('cold_look_like'),
  conditionDetails: text('condition_details'),
  diabetes: text('diabetes'),
  diarrhoea: text('diarrhoea'),
  diarrhoeaAction: text('diarrhoea_action'),
  eatCleanFood: text('eat_clean_food'),
  handAfterToilet: text('hand_after_toilet'),
  handBeforeMeal: text('hand_before_meal'),
  haveToothbrush: text('have_toothbrush'),
  hypertension: text('hypertension'),
  knowDoctor: text('know_doctor'),
  knowWaterFilters: text('know_water_filters'),
  mskInjury: text('msk_injury'),
  otherBrushTeeth: text('other_brush_teeth'),
  otherBuyMedicine: text('other_buy_medicine'),
  otherCondition: text('other_condition'),
  otherLearning: text('other_learning'),
  otherManagement: text('other_management'),
  otherSickAction: text('other_sick_action'),
  otherWaterFilterReason: text('other_water_filter_reason'),
  otherWaterSource: text('other_water_source'),
  ownTransport: text('own_transport'),
  povertyCard: text('poverty_card'),
  whereBuyMedicine: text('where_buy_medicine'),

  // Array fields - stored as JSON strings in SQLite
  // PostgreSQL uses native arrays, but SQLite stores them as JSON.stringify(['value1', 'value2'])
  cholesterolAction: text('cholesterol_action'),
  coldAction: text('cold_action'),
  diabetesAction: text('diabetes_action'),
  hypertensionAction: text('hypertension_action'),
  longTermConditions: text('long_term_conditions'),
  managementMethods: text('management_methods'),
  mskAction: text('msk_action'),
  notUsingWaterFilter: text('not_using_water_filter'),
  unsafeWater: text('unsafe_water'),
  waterSources: text('water_sources'),
  whatDoWhenSick: text('what_do_when_sick'),
});

/**
 * Sync Queue Table (Local SQLite only)
 * Manages the queue of operations to sync with Supabase
 * Not synced itself - purely for local state management
 */
export const syncQueue = sqliteTable('sync_queue', {
  // Primary identifier
  id: text('id').primaryKey(), // UUID

  // Timestamps
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  // Operation details
  operation: text('operation').notNull(), // 'create' | 'update' | 'delete'
  entityType: text('entity_type').notNull(), // 'pin' | 'form'
  entityId: text('entity_id').notNull(),

  // Idempotency - ensures operations aren't duplicated
  idempotencyKey: text('idempotency_key').notNull().unique(),

  // Payload - JSON stringified data
  payload: text('payload').notNull(),

  // Status tracking
  status: text('status').notNull(), // 'pending' | 'in_progress' | 'completed' | 'failed'

  // Retry logic
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),

  // Error handling
  lastError: text('last_error'),
  lastAttemptAt: text('last_attempt_at'),

  // Ordering - ensures operations execute in correct order
  sequenceNumber: integer('sequence_number').notNull(),

  // Dependencies - operation IDs this depends on (JSON array of IDs)
  dependsOn: text('depends_on'),

  // Device tracking
  deviceId: text('device_id'),
});

// Export types for use in the application
export type Pin = typeof pins.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type SyncQueueItem = typeof syncQueue.$inferSelect;
