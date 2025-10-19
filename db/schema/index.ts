/**
 * Database Schema Exports
 *
 * This file provides convenient exports for database schemas.
 * Import from here for cleaner code:
 *
 * @example
 * // SQLite schema (default for local development)
 * import { pins, forms, syncQueue } from '~/db/schema';
 */

// Export SQLite schema as default (used in the app)
export * from './sqlite';

// Re-export shared definitions for reference
export * as shared from './shared';
