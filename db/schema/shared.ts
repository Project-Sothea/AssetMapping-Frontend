/**
 * Shared Schema Definitions
 *
 * This file contains reusable field builders that work for both
 * SQLite (local) and PostgreSQL (Supabase) schemas.
 *
 * **SINGLE SOURCE OF TRUTH**: Change metadata once here, it applies to both databases automatically.
 *
 * **UNIFIED FORMAT**: Uses camelCase column names and JSON strings for arrays
 * in both databases - no conversion needed during sync!
 *
 * ## How to Use:
 *
 * ### SQLite Example:
 * ```typescript
 * import { text, real } from 'drizzle-orm/sqlite-core';
 * import { buildCommonPinFields, buildPinLocalFields } from '~/db/schema/shared';
 *
 * export const pins = sqliteTable('pins', {
 *   ...buildCommonPinFields(text, real),
 *   ...buildPinLocalFields(text),
 *   images: text('images'), // JSON string
 * });
 * ```
 *
 * ### PostgreSQL Example:
 * ```typescript
 * import { text, doublePrecision, timestamp } from 'drizzle-orm/pg-core';
 * import { buildCommonPinFields } from '~/db/schema/shared';
 *
 * export const pins = pgTable('pins', {
 *   ...buildCommonPinFields(text, doublePrecision, timestamp),
 *   images: text('images'), // JSON string (same format as SQLite!)
 * });
 * ```
 */

import { sql } from 'drizzle-orm';

/**
 * Build common Pin fields that work for both SQLite and PostgreSQL
 *
 * @param textType - text type from drizzle-orm (sqlite or pg)
 * @param numericType - real (sqlite) or doublePrecision (pg)
 * @param timestampFn - optional timestamp function for pg, uses text for sqlite
 * @returns Object with common pin field definitions
 */
export function buildCommonPinFields(
  textType: any,
  numericType: any,
  timestampFn?: (col: string) => any,
  intType?: any
) {
  const timestamp = timestampFn || ((col: string) => textType(col));
  const integer = intType || ((col: string) => textType(col));

  return {
    // Primary identifier
    id: textType('id').primaryKey(),

    // Timestamps - using camelCase for unified format
    createdAt: timestamp('createdAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp('deletedAt'), // Soft delete

    // Version for optimistic concurrency control
    version: integer('version').notNull().default(1),

    // Location
    lat: numericType('lat'),
    lng: numericType('lng'),

    // Details
    type: textType('type'),
    name: textType('name'),
    address: textType('address'),
    cityVillage: textType('cityVillage'),
    description: textType('description'),
  };
}

/**
 * Build local-only Pin fields for SQLite (sync tracking)
 *
 * @param textType - text type from drizzle-orm/sqlite-core
 * @returns Object with local-only pin field definitions
 */
export function buildPinLocalFields(textType: any) {
  return {
    failureReason: textType('failureReason'),
    status: textType('status'),
    lastSyncedAt: textType('lastSyncedAt'),
    lastFailedSyncAt: textType('lastFailedSyncAt'),
    localImages: textType('localImages'), // Local file paths before upload
  };
}

/**
 * Build common Form fields that work for both SQLite and PostgreSQL
 *
 * @param textType - text type from drizzle-orm
 * @param timestampFn - optional timestamp function for pg
 * @param intType - optional integer type for version column
 * @returns Object with common form field definitions (non-array fields)
 */
export function buildCommonFormFields(
  textType: any,
  timestampFn?: (col: string) => any,
  intType?: any
) {
  const timestamp = timestampFn || ((col: string) => textType(col));
  const integer = intType || ((col: string) => textType(col));

  return {
    // Primary identifier
    id: textType('id').primaryKey(),

    // Timestamps - camelCase for unified format
    createdAt: timestamp('createdAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updatedAt').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp('deletedAt'),

    // Version for optimistic concurrency control
    version: integer('version').notNull().default(1),

    // Relations
    pinId: textType('pinId'), // Foreign key
    villageId: textType('villageId'),
    name: textType('name'),
    village: textType('village'),

    // Health Assessment Fields (text fields) - camelCase
    brushTeeth: textType('brushTeeth'),
    canAttend: textType('canAttend'),
    cholesterol: textType('cholesterol'),
    coldLookLike: textType('coldLookLike'),
    conditionDetails: textType('conditionDetails'),
    diabetes: textType('diabetes'),
    diarrhoea: textType('diarrhoea'),
    diarrhoeaAction: textType('diarrhoeaAction'),
    eatCleanFood: textType('eatCleanFood'),
    handAfterToilet: textType('handAfterToilet'),
    handBeforeMeal: textType('handBeforeMeal'),
    haveToothbrush: textType('haveToothbrush'),
    hypertension: textType('hypertension'),
    knowDoctor: textType('knowDoctor'),
    knowWaterFilters: textType('knowWaterFilters'),
    mskInjury: textType('mskInjury'),
    otherBrushTeeth: textType('otherBrushTeeth'),
    otherBuyMedicine: textType('otherBuyMedicine'),
    otherCondition: textType('otherCondition'),
    otherLearning: textType('otherLearning'),
    otherManagement: textType('otherManagement'),
    otherSickAction: textType('otherSickAction'),
    otherWaterFilterReason: textType('otherWaterFilterReason'),
    otherWaterSource: textType('otherWaterSource'),
    ownTransport: textType('ownTransport'),
    povertyCard: textType('povertyCard'),
    whereBuyMedicine: textType('whereBuyMedicine'),
  };
}

/**
 * Build Form array fields
 * Arrays stored as JSON strings (TEXT) in both SQLite and PostgreSQL for unified format
 *
 * @param textType - text type from drizzle-orm
 * @returns Object with array field definitions (all TEXT/JSON strings)
 */
export function buildFormArrayFields(textType: any) {
  return {
    cholesterolAction: textType('cholesterolAction'),
    coldAction: textType('coldAction'),
    diabetesAction: textType('diabetesAction'),
    hypertensionAction: textType('hypertensionAction'),
    longTermConditions: textType('longTermConditions'),
    managementMethods: textType('managementMethods'),
    mskAction: textType('mskAction'),
    notUsingWaterFilter: textType('notUsingWaterFilter'),
    unsafeWater: textType('unsafeWater'),
    waterSources: textType('waterSources'),
    whatDoWhenSick: textType('whatDoWhenSick'),
  };
}

/**
 * Build local-only Form fields for SQLite (sync tracking)
 *
 * @param textType - text type from drizzle-orm/sqlite-core
 * @returns Object with local-only form field definitions
 */
export function buildFormLocalFields(textType: any) {
  return {
    failureReason: textType('failureReason'),
    status: textType('status'),
    lastSyncedAt: textType('lastSyncedAt'),
    lastFailedSyncAt: textType('lastFailedSyncAt'),
  };
}

/**
 * Build Sync Queue fields for SQLite only
 * Not synced to Supabase - local operation queue management
 *
 * @param textType - text type from drizzle-orm/sqlite-core
 * @param intType - integer type from drizzle-orm/sqlite-core
 * @returns Object with sync queue field definitions
 */
export function buildSyncQueueFields(textType: any, intType: any) {
  return {
    id: textType('id').primaryKey(),
    createdAt: textType('createdAt')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    operation: textType('operation').notNull(),
    entityType: textType('entityType').notNull(),
    entityId: textType('entityId').notNull(),
    idempotencyKey: textType('idempotencyKey').notNull().unique(),
    payload: textType('payload').notNull(),
    status: textType('status').notNull(),
    attempts: intType('attempts').notNull().default(0),
    maxAttempts: intType('maxAttempts').notNull().default(3),
    lastError: textType('lastError'),
    lastAttemptAt: textType('lastAttemptAt'),
    sequenceNumber: intType('sequenceNumber'),
    dependsOn: textType('dependsOn'),
    deviceId: textType('deviceId'),
  };
}
