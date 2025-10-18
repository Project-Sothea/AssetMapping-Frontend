/**
 * Drizzle Kit Configuration for SQLite (Local Database)
 *
 * This is the default configuration used for local development with Expo SQLite.
 *
 * Usage:
 * - Generate migration: npx drizzle-kit generate
 * - Push to database: npx drizzle-kit push
 * - Open studio: npx drizzle-kit studio
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema/sqlite.ts',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  driver: 'expo', // <--- very important for Expo SQLite
} satisfies Config;
