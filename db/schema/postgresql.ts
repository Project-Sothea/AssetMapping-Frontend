/**
 * PostgreSQL Schema (Supabase Remote Database)
 * 
 * This schema defines the remote PostgreSQL/Supabase database structure using Drizzle ORM.
 * It includes:
 * - Common fields (synced with local SQLite)
 * - snake_case naming convention (PostgreSQL/SQL style)
 * - Native array types (text[]) instead of JSON strings
 * - NO local-only fields (those stay in SQLite)
 * 
 * Note: This schema is for documentation and potential future migration generation.
 * The actual Supabase schema is currently managed via Supabase dashboard/SQL editor.
 */

import { pgTable, text, uuid, timestamp, doublePrecision } from 'drizzle-orm/pg-core';

/**
 * Pins table (PostgreSQL/Supabase)
 * Stores location pins with health facility/community information
 */
export const pins = pgTable('pins', {
  // Primary identifier
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  
  // Location data (using double precision for better accuracy)
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  
  // Details
  type: text('type'),
  name: text('name'),
  address: text('address'),
  city_village: text('city_village'),
  description: text('description'),
  
  // Images - native PostgreSQL text array
  images: text('images').array(), // ['url1', 'url2'] - native array, not JSON string
});

/**
 * Forms table (PostgreSQL/Supabase)
 * Stores health assessment forms linked to pins
 */
export const forms = pgTable('forms', {
  // Primary identifier
  id: uuid('id').primaryKey().defaultRandom(),

  // Timestamps
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),

  // Relations
  pin_id: uuid('pin_id'),
  village_id: text('village_id'),
  village: text('village'),

  // Health Assessment Fields (single-value text fields)
  brush_teeth: text('brush_teeth'),
  can_attend: text('can_attend'),
  cholesterol: text('cholesterol'),
  cold_look_like: text('cold_look_like'),
  condition_details: text('condition_details'),
  diabetes: text('diabetes'),
  diarrhoea: text('diarrhoea'),
  diarrhoea_action: text('diarrhoea_action'),
  eat_clean_food: text('eat_clean_food'),
  hand_after_toilet: text('hand_after_toilet'),
  hand_before_meal: text('hand_before_meal'),
  have_toothbrush: text('have_toothbrush'),
  hypertension: text('hypertension'),
  know_doctor: text('know_doctor'),
  know_water_filters: text('know_water_filters'),
  msk_injury: text('msk_injury'),
  other_brush_teeth: text('other_brush_teeth'),
  other_buy_medicine: text('other_buy_medicine'),
  other_condition: text('other_condition'),
  other_learning: text('other_learning'),
  other_management: text('other_management'),
  other_sick_action: text('other_sick_action'),
  other_water_filter_reason: text('other_water_filter_reason'),
  other_water_source: text('other_water_source'),
  own_transport: text('own_transport'),
  poverty_card: text('poverty_card'),
  where_buy_medicine: text('where_buy_medicine'),
  
  // Array fields - native PostgreSQL text arrays
  cholesterol_action: text('cholesterol_action').array(),
  cold_action: text('cold_action').array(),
  diabetes_action: text('diabetes_action').array(),
  hypertension_action: text('hypertension_action').array(),
  long_term_conditions: text('long_term_conditions').array(),
  management_methods: text('management_methods').array(),
  msk_action: text('msk_action').array(),
  not_using_water_filter: text('not_using_water_filter').array(),
  unsafe_water: text('unsafe_water').array(),
  water_sources: text('water_sources').array(),
  what_do_when_sick: text('what_do_when_sick').array(),
});

// Export types for use in the application
export type PinPostgres = typeof pins.$inferSelect;
export type FormPostgres = typeof forms.$inferSelect;

/**
 * Field Comparison: SQLite vs PostgreSQL
 * 
 * SQLite (Local):
 * - camelCase field names in code
 * - snake_case in database
 * - Arrays as JSON strings: '["value1", "value2"]'
 * - Has local-only fields: failureReason, status, lastSyncedAt, etc.
 * - ISO 8601 timestamp strings: '2024-10-18T10:30:00Z'
 * 
 * PostgreSQL (Supabase):
 * - snake_case field names
 * - Native arrays: {value1, value2} or ARRAY['value1', 'value2']
 * - NO local-only fields
 * - Native timestamps with timezone
 * 
 * Key Differences:
 * 1. Naming: camelCase (SQLite code) vs snake_case (PostgreSQL)
 * 2. Arrays: JSON strings (SQLite) vs native arrays (PostgreSQL)
 * 3. Timestamps: TEXT (SQLite) vs TIMESTAMP WITH TIME ZONE (PostgreSQL)
 * 4. IDs: TEXT (SQLite) vs UUID (PostgreSQL)
 * 5. Numbers: REAL (SQLite) vs DOUBLE PRECISION (PostgreSQL)
 * 6. Local fields: Present (SQLite) vs Absent (PostgreSQL)
 */
