/**
 * Database Schema Exports
 * 
 * This file provides convenient exports for database schemas.
 * Import from here for cleaner code:
 * 
 * @example
 * // SQLite schema (default for local development)
 * import { pins, forms, syncQueue } from '~/db/schema';
 * 
 * // Or explicitly import from specific schema
 * import { pins as sqlitePins } from '~/db/schema/sqlite';
 * import { pins as postgresPins } from '~/db/schema/postgresql';
 */

// Export SQLite schema as default (used in the app)
export * from './sqlite';

// Re-export shared definitions for reference
export * as shared from './shared';

// Re-export PostgreSQL schema for migrations/documentation
export * as postgresql from './postgresql';
