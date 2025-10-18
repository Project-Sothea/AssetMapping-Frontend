/**
 * Shared Schema Definitions
 *
 * This file contains the common field definitions that are shared between
 * SQLite (local) and PostgreSQL (Supabase) schemas.
 *
 * By defining fields once here, we ensure:
 * - No schema drift between local and remote databases
 * - Single source of truth for field definitions
 * - Type safety across the entire application
 * - Easier schema evolution and migrations
 */

/**
 * Common Pin fields shared between SQLite and PostgreSQL
 * These fields have the same meaning and similar types in both databases
 */
export const pinCommonFields = {
  // Identifiers
  id: 'id', // UUID primary key

  // Timestamps
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at', // Soft delete timestamp

  // Location
  lat: 'lat', // Latitude (real/float)
  lng: 'lng', // Longitude (real/float)

  // Details
  type: 'type', // Pin type/category
  name: 'name', // Pin name
  address: 'address',
  cityVillage: 'city_village',
  description: 'description',

  // Images
  images: 'images', // SQLite: JSON string, PostgreSQL: text[] array
} as const;

/**
 * Local-only Pin fields (SQLite only)
 * These fields exist only in the local database for sync tracking
 */
export const pinLocalOnlyFields = {
  failureReason: 'failure_reason',
  status: 'status',
  lastSyncedAt: 'last_synced_at',
  lastFailedSyncAt: 'last_failed_sync_at',
  localImages: 'local_images', // Local file paths before upload
} as const;

/**
 * Common Form fields shared between SQLite and PostgreSQL
 */
export const formCommonFields = {
  // Identifiers
  id: 'id', // UUID primary key

  // Timestamps
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',

  // Relations
  pinId: 'pin_id', // Foreign key to pins table
  villageId: 'village_id',
  village: 'village',

  // Health Assessment Fields (text fields)
  brushTeeth: 'brush_teeth',
  canAttend: 'can_attend',
  cholesterol: 'cholesterol',
  coldLookLike: 'cold_look_like',
  conditionDetails: 'condition_details',
  diabetes: 'diabetes',
  diarrhoea: 'diarrhoea',
  diarrhoeaAction: 'diarrhoea_action',
  eatCleanFood: 'eat_clean_food',
  handAfterToilet: 'hand_after_toilet',
  handBeforeMeal: 'hand_before_meal',
  haveToothbrush: 'have_toothbrush',
  hypertension: 'hypertension',
  knowDoctor: 'know_doctor',
  knowWaterFilters: 'know_water_filters',
  mskInjury: 'msk_injury',
  otherBrushTeeth: 'other_brush_teeth',
  otherBuyMedicine: 'other_buy_medicine',
  otherCondition: 'other_condition',
  otherLearning: 'other_learning',
  otherManagement: 'other_management',
  otherSickAction: 'other_sick_action',
  otherWaterFilterReason: 'other_water_filter_reason',
  otherWaterSource: 'other_water_source',
  ownTransport: 'own_transport',
  povertyCard: 'poverty_card',
  whereBuyMedicine: 'where_buy_medicine',

  // Array Fields (SQLite: JSON string, PostgreSQL: text[] array)
  cholesterolAction: 'cholesterol_action',
  coldAction: 'cold_action',
  diabetesAction: 'diabetes_action',
  hypertensionAction: 'hypertension_action',
  longTermConditions: 'long_term_conditions',
  managementMethods: 'management_methods',
  mskAction: 'msk_action',
  notUsingWaterFilter: 'not_using_water_filter',
  unsafeWater: 'unsafe_water',
  waterSources: 'water_sources',
  whatDoWhenSick: 'what_do_when_sick',
} as const;

/**
 * Local-only Form fields (SQLite only)
 */
export const formLocalOnlyFields = {
  failureReason: 'failure_reason',
  status: 'status',
  lastSyncedAt: 'last_synced_at',
  lastFailedSyncAt: 'last_failed_sync_at',
} as const;

/**
 * Sync Queue fields (SQLite only - not synced to Supabase)
 * Used for managing the local operation queue
 */
export const syncQueueFields = {
  id: 'id',
  createdAt: 'created_at',
  operation: 'operation',
  entityType: 'entity_type',
  entityId: 'entity_id',
  idempotencyKey: 'idempotency_key',
  payload: 'payload',
  status: 'status',
  attempts: 'attempts',
  maxAttempts: 'max_attempts',
  lastError: 'last_error',
  lastAttemptAt: 'last_attempt_at',
  sequenceNumber: 'sequence_number',
  dependsOn: 'depends_on',
  deviceId: 'device_id',
} as const;

/**
 * Field name mappings for type safety
 */
export type PinCommonField = (typeof pinCommonFields)[keyof typeof pinCommonFields];
export type PinLocalOnlyField = (typeof pinLocalOnlyFields)[keyof typeof pinLocalOnlyFields];
export type FormCommonField = (typeof formCommonFields)[keyof typeof formCommonFields];
export type FormLocalOnlyField = (typeof formLocalOnlyFields)[keyof typeof formLocalOnlyFields];
export type SyncQueueField = (typeof syncQueueFields)[keyof typeof syncQueueFields];
