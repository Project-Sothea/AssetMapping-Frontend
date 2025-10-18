import { sql } from 'drizzle-orm';
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const pins = sqliteTable('pins', {
  id: text('id').primaryKey(), // UUID
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
  failureReason: text('failure_reason'),
  status: text('status'),
  lastSyncedAt: text('last_synced_at'),
  lastFailedSyncAt: text('last_failed_sync_at'),
  lat: real('lat'),
  lng: real('lng'),
  type: text('type'),
  name: text('name'),
  address: text('address'),
  city_village: text('city/village'),
  description: text('description'),
  images: text('images'), // stored as JSON string: JSON.stringify(imagesArray)
  localImages: text('local_images'),
});

export const forms = sqliteTable('forms', {
  id: text('id').primaryKey(), // UUID

  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text('deleted_at'),
  failureReason: text('failure_reason'),
  status: text('status'),
  lastSyncedAt: text('last_synced_at'),
  lastFailedSyncAt: text('last_failed_sync_at'),

  pinId: text('pin_id'),
  villageId: text('village_id'),
  village: text('village'),

  brushTeeth: text('brush_teeth'),
  canAttend: text('can_attend'),
  cholesterol: text('cholesterol'),
  cholesterolAction: text('cholesterol_action'), // JSON stringified array
  coldAction: text('cold_action'), // JSON stringified array
  coldLookLike: text('cold_look_like'),
  conditionDetails: text('condition_details'),
  diabetes: text('diabetes'),
  diabetesAction: text('diabetes_action'), // JSON stringified array
  diarrhoea: text('diarrhoea'),
  diarrhoeaAction: text('diarrhoea_action'),
  eatCleanFood: text('eat_clean_food'),
  handAfterToilet: text('hand_after_toilet'),
  handBeforeMeal: text('hand_before_meal'),
  haveToothbrush: text('have_toothbrush'),
  hypertension: text('hypertension'),
  hypertensionAction: text('hypertension_action'), // JSON stringified array
  knowDoctor: text('know_doctor'),
  knowWaterFilters: text('know_water_filters'),
  longTermConditions: text('long_term_conditions'), // JSON stringified array
  managementMethods: text('management_methods'), // JSON stringified array
  mskAction: text('msk_action'), // JSON stringified array
  mskInjury: text('msk_injury'),
  notUsingWaterFilter: text('not_using_water_filter'), // JSON stringified array
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
  unsafeWater: text('unsafe_water'), // JSON stringified array
  waterSources: text('water_sources'), // JSON stringified array
  whatDoWhenSick: text('what_do_when_sick'), // JSON stringified array
  whereBuyMedicine: text('where_buy_medicine'),
});

// Sync Queue Table for Operation Queue
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

// Export pin to use as an interface in your app
export type Pin = typeof pins.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type SyncQueueItem = typeof syncQueue.$inferSelect;
