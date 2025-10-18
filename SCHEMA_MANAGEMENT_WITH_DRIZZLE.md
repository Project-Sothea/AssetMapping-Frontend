### Schema Management with Drizzle Guide

## Overview

This project now uses **Drizzle ORM** to manage both local (SQLite) and remote (PostgreSQL/Supabase) database schemas from a single codebase. This ensures:

- ✅ **Single source of truth** for schema definitions
- ✅ **No schema drift** between local and remote databases
- ✅ **Type-safe** database operations
- ✅ **Version-controlled** schema changes
- ✅ **Automated migrations** generation

## Architecture

```
db/schema/
├── shared.ts          # Common field definitions
├── sqlite.ts          # Local SQLite schema (with local-only fields)
├── postgresql.ts      # Remote PostgreSQL schema (without local-only fields)
└── index.ts           # Convenient exports

drizzle.config.ts              # SQLite/Expo config (default)
drizzle.config.postgresql.ts   # PostgreSQL/Supabase config

drizzle/
├── sqlite/            # SQLite migrations
└── postgresql/        # PostgreSQL migrations
```

## Key Differences: SQLite vs PostgreSQL

### 1. **Naming Convention**
- **SQLite**: camelCase in TypeScript code, snake_case in database
- **PostgreSQL**: snake_case everywhere

### 2. **Array Fields**
- **SQLite**: Stored as JSON strings
  ```typescript
  images: '["url1.jpg", "url2.jpg"]'  // TEXT column
  ```
- **PostgreSQL**: Native arrays
  ```sql
  images: {"url1.jpg", "url2.jpg"}  -- text[] column
  ```

### 3. **Timestamps**
- **SQLite**: ISO 8601 strings in TEXT columns
  ```typescript
  created_at: '2024-10-18T10:30:00Z'
  ```
- **PostgreSQL**: Native TIMESTAMP WITH TIME ZONE
  ```sql
  created_at: 2024-10-18 10:30:00+00
  ```

### 4. **Local-Only Fields**
SQLite has additional fields for sync tracking that don't exist in PostgreSQL:
- `failure_reason`
- `status`
- `last_synced_at`
- `last_failed_sync_at`
- `local_images` (pins only)

### 5. **Sync Queue**
The `sync_queue` table exists **only in SQLite** - it's not synced to Supabase.

## Setup

### 1. Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase PostgreSQL Connection String
# Format: postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_DB_URL=postgresql://postgres:your-password@your-project.supabase.co:5432/postgres
```

Get your connection string from:
1. Supabase Dashboard → Settings → Database
2. Look for "Connection string" under "Connection parameters"
3. Choose "URI" format and copy with your password

### 2. Install Dependencies

Already installed:
```bash
npm install pg @types/pg
npm install --save-dev drizzle-kit
```

## Usage

### SQLite (Local Development)

These commands work with your local Expo SQLite database:

```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema directly to database (development)
npm run db:push

# Open Drizzle Studio to browse your local database
npm run db:studio
```

### PostgreSQL/Supabase (Remote)

These commands work with your Supabase PostgreSQL database:

```bash
# Generate PostgreSQL migrations from schema
npm run db:pg:generate

# Push schema changes directly to Supabase (development)
npm run db:pg:push

# Pull current Supabase schema (introspection)
npm run db:pg:pull

# Open Drizzle Studio to browse Supabase database
npm run db:pg:studio
```

## Workflow

### Making Schema Changes

#### Option 1: Modify Both Schemas (Recommended)

When adding a new common field:

1. **Update SQLite schema** (`db/schema/sqlite.ts`):
   ```typescript
   export const pins = sqliteTable('pins', {
     // ... existing fields
     newField: text('new_field'),
   });
   ```

2. **Update PostgreSQL schema** (`db/schema/postgresql.ts`):
   ```typescript
   export const pins = pgTable('pins', {
     // ... existing fields
     new_field: text('new_field'),
   });
   ```

3. **Generate migrations**:
   ```bash
   # For SQLite
   npm run db:generate
   
   # For PostgreSQL
   npm run db:pg:generate
   ```

4. **Apply migrations**:
   ```bash
   # SQLite runs automatically in app via useMigrations
   # PostgreSQL:
   npm run db:pg:push
   ```

#### Option 2: Pull from Supabase (When Supabase is source of truth)

If you made changes directly in Supabase dashboard:

```bash
# Pull current schema from Supabase
npm run db:pg:pull

# This generates a schema file based on your actual database
# Review and integrate changes into db/schema/postgresql.ts
```

### Adding Local-Only Fields

For fields that should only exist in SQLite (e.g., sync tracking):

1. Add to `db/schema/sqlite.ts` only
2. Do NOT add to `db/schema/postgresql.ts`
3. Generate SQLite migration: `npm run db:generate`

Example:
```typescript
// Only in sqlite.ts
export const pins = sqliteTable('pins', {
  // ... existing fields
  customLocalField: text('custom_local_field'), // Only in SQLite
});
```

### Adding Array Fields

1. **SQLite**: Add as TEXT column
   ```typescript
   tags: text('tags'),  // Will store JSON.stringify(['tag1', 'tag2'])
   ```

2. **PostgreSQL**: Add as text array
   ```typescript
   tags: text('tags').array(),  // Native array support
   ```

3. **Add to field mappings** (`shared/utils/fieldMappings.ts`):
   ```typescript
   export const PIN_ARRAY_FIELDS_SNAKE = ['images', 'tags'];
   export const PIN_ARRAY_FIELDS_CAMEL = ['images', 'tags'];
   ```

## Drizzle Studio

Drizzle Studio provides a visual interface to browse and edit your database:

```bash
# Local SQLite
npm run db:studio

# Remote PostgreSQL/Supabase
npm run db:pg:studio
```

Opens in browser at `https://local.drizzle.studio`

## Migration Files

### SQLite Migrations
Located in `drizzle/sqlite/`:
- Used by the app at runtime
- Imported in `services/drizzleDb.ts`
- Applied via `useMigrations()` hook

### PostgreSQL Migrations
Located in `drizzle/postgresql/`:
- Applied manually via `npm run db:pg:push`
- Or applied in Supabase via SQL editor
- Version controlled for team collaboration

## Type Safety

The schema definitions provide TypeScript types throughout your app:

```typescript
import type { Pin, Form, SyncQueueItem } from '~/db/schema';

// Pin type has all fields with correct types
const pin: Pin = {
  id: 'uuid',
  createdAt: '2024-10-18T10:30:00Z',
  images: '["url1.jpg"]',  // JSON string in SQLite
  // ... other fields
};

// PostgreSQL types (for reference)
import type { PinPostgres } from '~/db/schema/postgresql';

const pgPin: PinPostgres = {
  id: 'uuid',
  created_at: new Date(),
  images: ['url1.jpg'],  // Native array in PostgreSQL
  // ... other fields
};
```

## Benefits

### Before (Manual Schema Management)
- ❌ Schema defined in Supabase dashboard
- ❌ Local schema could drift from remote
- ❌ Manual type definitions (`database.types.ts`)
- ❌ Error-prone schema updates
- ❌ No version control for schema changes

### After (Drizzle Schema Management)
- ✅ Schema defined in code (version controlled)
- ✅ Single source of truth
- ✅ Auto-generated types
- ✅ Type-safe queries
- ✅ Migration generation
- ✅ No schema drift

## Best Practices

### 1. **Always Update Both Schemas**
When adding common fields, update both SQLite and PostgreSQL schemas to keep them in sync.

### 2. **Use Shared Definitions**
Reference `db/schema/shared.ts` to understand which fields are common vs local-only.

### 3. **Test Locally First**
- Make schema changes
- Test with SQLite locally
- Verify migrations work
- Then push to PostgreSQL/Supabase

### 4. **Review Generated Migrations**
Always review migration files before applying:
```bash
# Check what changed
ls -la drizzle/sqlite/
ls -la drizzle/postgresql/

# Review the SQL
cat drizzle/postgresql/0001_new_migration.sql
```

### 5. **Backup Before Major Changes**
Before pushing to Supabase:
```bash
# Export current data from Supabase dashboard
# Or use pg_dump if you have direct access
```

### 6. **Use Migrations in Production**
For production Supabase:
1. Generate migration: `npm run db:pg:generate`
2. Review the SQL file
3. Apply via Supabase SQL editor (more control)
4. Or use `npm run db:pg:push` (direct push)

## Troubleshooting

### "Cannot connect to database"
- Check `SUPABASE_DB_URL` in `.env`
- Verify Supabase project is running
- Check your IP is allowed in Supabase settings

### "Migration failed"
- Check for conflicting schema changes
- Review the generated SQL
- Apply migrations manually if needed

### "Types don't match"
- Regenerate types: `npm run db:generate`
- Restart TypeScript server in VS Code
- Check for stale imports

### "Sync failing after schema change"
- Update conversion utilities in `shared/utils/`
- Add new array fields to `fieldMappings.ts`
- Verify bidirectional conversion works

## Integration with Existing Code

The new schema structure integrates seamlessly:

```typescript
// Old import (still works via barrel export)
import { pins, forms } from '~/db/schema';

// New explicit imports
import { pins, forms } from '~/db/schema/sqlite';
import { pins as pgPins } from '~/db/schema/postgresql';

// Shared definitions
import { pinCommonFields } from '~/db/schema/shared';
```

All existing code continues to work - the schema files maintain the same exports.

## Next Steps

1. **Set up environment variables** (`.env` with `SUPABASE_DB_URL`)
2. **Pull current Supabase schema**: `npm run db:pg:pull`
3. **Integrate pulled schema** into `postgresql.ts`
4. **Test schema generation**: `npm run db:pg:generate`
5. **Verify types** are generated correctly
6. **Document any custom migrations** needed

## Future Enhancements

- Add schema validation tests
- Automate schema sync checks in CI/CD
- Generate schema documentation automatically
- Add schema diff tooling
- Create backup/restore scripts

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle Kit Docs](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Array Types](https://www.postgresql.org/docs/current/arrays.html)
- [SQLite JSON Functions](https://www.sqlite.org/json1.html)

---

**Note**: This schema management setup provides a foundation for maintaining consistency between local and remote databases. As your schema evolves, Drizzle will help you manage changes safely and efficiently.
