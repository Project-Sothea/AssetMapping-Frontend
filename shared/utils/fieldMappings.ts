/**
 * Field mappings for array fields that require special handling
 * during conversion between SQLite (JSON strings) and PostgreSQL (arrays)
 * 
 * SQLite stores arrays as JSON strings (TEXT columns)
 * PostgreSQL stores arrays as native array types
 * 
 * When sending data TO Supabase: JSON strings → arrays
 * When receiving data FROM Supabase: arrays → JSON strings
 */

/**
 * Form array fields in snake_case (PostgreSQL format)
 * Used when converting FROM camelCase TO snake_case (sending to Supabase)
 */
export const FORM_ARRAY_FIELDS_SNAKE = [
  'cholesterol_action',
  'cold_action',
  'diabetes_action',
  'hypertension_action',
  'long_term_conditions',
  'management_methods',
  'msk_action',
  'not_using_water_filter',
  'unsafe_water',
  'water_sources',
  'what_do_when_sick',
];

/**
 * Form array fields in camelCase (SQLite format)
 * Used when converting FROM snake_case TO camelCase (receiving from Supabase)
 */
export const FORM_ARRAY_FIELDS_CAMEL = [
  'cholesterolAction',
  'coldAction',
  'diabetesAction',
  'hypertensionAction',
  'longTermConditions',
  'managementMethods',
  'mskAction',
  'notUsingWaterFilter',
  'unsafeWater',
  'waterSources',
  'whatDoWhenSick',
];

/**
 * Pin array fields in snake_case (PostgreSQL format)
 * Used when converting FROM camelCase TO snake_case (sending to Supabase)
 */
export const PIN_ARRAY_FIELDS_SNAKE = ['images'];

/**
 * Pin array fields in camelCase (SQLite format)
 * Used when converting FROM snake_case TO camelCase (receiving from Supabase)
 */
export const PIN_ARRAY_FIELDS_CAMEL = ['images'];
