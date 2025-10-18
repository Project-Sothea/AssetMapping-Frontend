/**
 * Shared utilities for case conversion and field mappings
 *
 * This module provides centralized utilities for converting between
 * SQLite (camelCase, JSON strings) and PostgreSQL (snake_case, arrays).
 */

export {
  toSnakeCase,
  toCamelCase,
  convertKeysToSnakeCase,
  convertKeysToCamelCase,
} from './caseConversion';

export {
  FORM_ARRAY_FIELDS_SNAKE,
  FORM_ARRAY_FIELDS_CAMEL,
  PIN_ARRAY_FIELDS_SNAKE,
  PIN_ARRAY_FIELDS_CAMEL,
} from './fieldMappings';
