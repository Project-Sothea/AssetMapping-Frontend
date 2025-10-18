/**
 * Drizzle Kit Configuration for PostgreSQL/Supabase
 * 
 * This configuration is used to:
 * 1. Generate PostgreSQL migrations from the schema
 * 2. Push schema changes to Supabase
 * 3. Pull schema from Supabase for introspection
 * 
 * Usage:
 * - Generate migration: npx drizzle-kit generate:pg
 * - Push to database: npx drizzle-kit push:pg
 * - Pull from database: npx drizzle-kit pull:pg
 * - Open studio: npx drizzle-kit studio
 * 
 * Environment Variables Required:
 * - SUPABASE_DB_URL: PostgreSQL connection string
 *   Format: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
 */

import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema/postgresql.ts',
  out: './drizzle/postgresql',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL!,
  },
} satisfies Config;
