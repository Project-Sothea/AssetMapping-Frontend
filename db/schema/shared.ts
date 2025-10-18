/**
 * Shared Schema Definitions
 *
 * This file contains reusable field builders that work for both
 * SQLite (local) and PostgreSQL (Supabase) schemas.
 *
 * **SINGLE SOURCE OF TRUTH**: Change metadata once here, it applies to both databases automatically.
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
 *   images: text('images'), // JSON string for arrays
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
 *   images: text('images').array(), // Native array
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
  timestampFn?: (col: string) => any
) {
  const timestamp = timestampFn || ((col: string) => textType(col));

  return {
    // Primary identifier
    id: textType('id').primaryKey(),

    // Timestamps
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp('deleted_at'), // Soft delete

    // Location
    lat: numericType('lat'),
    lng: numericType('lng'),

    // Details
    type: textType('type'),
    name: textType('name'),
    address: textType('address'),
    cityVillage: textType('city_village'),
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
    failureReason: textType('failure_reason'),
    status: textType('status'),
    lastSyncedAt: textType('last_synced_at'),
    lastFailedSyncAt: textType('last_failed_sync_at'),
    localImages: textType('local_images'), // Local file paths before upload
  };
}

/**
 * Build common Form fields that work for both SQLite and PostgreSQL
 *
 * @param textType - text type from drizzle-orm
 * @param timestampFn - optional timestamp function for pg
 * @returns Object with common form field definitions (non-array fields)
 */
export function buildCommonFormFields(
  textType: any,
  timestampFn?: (col: string) => any
) {
  const timestamp = timestampFn || ((col: string) => textType(col));

  return {
    // Primary identifier
    id: textType('id').primaryKey(),

    // Timestamps
    createdAt: timestamp('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`),
    deletedAt: timestamp('deleted_at'),

    // Relations
    pinId: textType('pin_id'), // Foreign key
    villageId: textType('village_id'),
    village: textType('village'),

    // Health Assessment Fields (text fields)
    brushTeeth: textType('brush_teeth'),
    canAttend: textType('can_attend'),
    cholesterol: textType('cholesterol'),
    coldLookLike: textType('cold_look_like'),
    conditionDetails: textType('condition_details'),
    diabetes: textType('diabetes'),
    diarrhoea: textType('diarrhoea'),
    diarrhoeaAction: textType('diarrhoea_action'),
    eatCleanFood: textType('eat_clean_food'),
    handAfterToilet: textType('hand_after_toilet'),
    handBeforeMeal: textType('hand_before_meal'),
    haveToothbrush: textType('have_toothbrush'),
    hypertension: textType('hypertension'),
    knowDoctor: textType('know_doctor'),
    knowWaterFilters: textType('know_water_filters'),
    mskInjury: textType('msk_injury'),
    otherBrushTeeth: textType('other_brush_teeth'),
    otherBuyMedicine: textType('other_buy_medicine'),
    otherCondition: textType('other_condition'),
    otherLearning: textType('other_learning'),
    otherManagement: textType('other_management'),
    otherSickAction: textType('other_sick_action'),
    otherWaterFilterReason: textType('other_water_filter_reason'),
    otherWaterSource: textType('other_water_source'),
    ownTransport: textType('own_transport'),
    povertyCard: textType('poverty_card'),
    whereBuyMedicine: textType('where_buy_medicine'),
  };
}

/**
 * Build Form array fields
 * SQLite stores as JSON text, PostgreSQL as native text[] arrays
 *
 * @param arrayFieldFn - For sqlite: text(), For pg: text().array()
 * @returns Object with array field definitions
 */
export function buildFormArrayFields(arrayFieldFn: (col: string) => any) {
  return {
    cholesterolAction: arrayFieldFn('cholesterol_action'),
    coldAction: arrayFieldFn('cold_action'),
    diabetesAction: arrayFieldFn('diabetes_action'),
    hypertensionAction: arrayFieldFn('hypertension_action'),
    longTermConditions: arrayFieldFn('long_term_conditions'),
    managementMethods: arrayFieldFn('management_methods'),
    mskAction: arrayFieldFn('msk_action'),
    notUsingWaterFilter: arrayFieldFn('not_using_water_filter'),
    unsafeWater: arrayFieldFn('unsafe_water'),
    waterSources: arrayFieldFn('water_sources'),
    whatDoWhenSick: arrayFieldFn('what_do_when_sick'),
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
    failureReason: textType('failure_reason'),
    status: textType('status'),
    lastSyncedAt: textType('last_synced_at'),
    lastFailedSyncAt: textType('last_failed_sync_at'),
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
    createdAt: textType('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    operation: textType('operation').notNull(),
    entityType: textType('entity_type').notNull(),
    entityId: textType('entity_id').notNull(),
    idempotencyKey: textType('idempotency_key').notNull().unique(),
    payload: textType('payload').notNull(),
    status: textType('status').notNull(),
    attempts: intType('attempts').notNull().default(0),
    maxAttempts: intType('max_attempts').notNull().default(3),
    lastError: textType('last_error'),
    lastAttemptAt: textType('last_attempt_at'),
    sequenceNumber: intType('sequence_number'),
    dependsOn: textType('depends_on'),
    deviceId: textType('device_id'),
  };
}

/**
 * Field name constants for reference
 */
export const FIELD_NAMES = {
  // Common timestamp fields
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  DELETED_AT: 'deleted_at',

  // Pin fields
  PIN_ID: 'id',
  PIN_LAT: 'lat',
  PIN_LNG: 'lng',
  PIN_TYPE: 'type',
  PIN_NAME: 'name',
  PIN_ADDRESS: 'address',
  PIN_CITY_VILLAGE: 'city_village',
  PIN_DESCRIPTION: 'description',
  PIN_IMAGES: 'images',

  // Form fields
  FORM_ID: 'id',
  FORM_PIN_ID: 'pin_id',
  FORM_VILLAGE_ID: 'village_id',
  FORM_VILLAGE: 'village',

  // Local-only fields (sync tracking)
  FAILURE_REASON: 'failure_reason',
  STATUS: 'status',
  LAST_SYNCED_AT: 'last_synced_at',
  LAST_FAILED_SYNC_AT: 'last_failed_sync_at',
  LOCAL_IMAGES: 'local_images',
} as const;
