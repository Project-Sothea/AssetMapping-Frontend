# Unified Format Migration Guide

## Overview

This migration unifies the database format to use:

- **camelCase** column names everywhere (no more snake_case)
- **JSON strings** for arrays (no more PostgreSQL text[] arrays)

This eliminates ~240 lines of conversion code and makes the codebase simpler.

## ⚠️ WARNING: BREAKING CHANGE

This migration will:

1. Rename all columns from snake_case → camelCase
2. Convert array columns from text[] → text (JSON strings)
3. **Break compatibility** with any code expecting snake_case

## Pre-Migration Checklist

### 1. Backup Database

```bash
# Via Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Create a manual backup
# 3. Wait for completion
```

### 2. Stop Sync Operations

- Ensure no mobile devices are actively syncing
- Consider maintenance window if needed

### 3. Review Migration Script

```bash
# Check the migration file
cat drizzle/postgresql/0013_unified_camelcase_migration.sql
```

## Migration Steps

### Option A: Via Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**

   - Navigate to your project
   - Go to SQL Editor

2. **Run Migration**

   - Copy contents of `drizzle/postgresql/0013_unified_camelcase_migration.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for completion (should take < 1 minute for small datasets)

3. **Verify Success**

   ```sql
   -- Check pins table columns
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'pins';

   -- Should see: createdAt, updatedAt, cityVillage, etc. (all camelCase)
   ```

### Option B: Via Drizzle Push

⚠️ **Not Recommended** - Drizzle push will try to drop and recreate columns, losing data.

### Option C: Manual psql (Advanced)

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# Run migration
\i drizzle/postgresql/0013_unified_camelcase_migration.sql
```

## Post-Migration Steps

### 1. Regenerate Type Definitions

#### If using Supabase CLI:

```bash
npx supabase gen types typescript --project-id [YOUR-PROJECT-ID] > utils/database.types.ts
```

#### If using Drizzle Kit:

```bash
npm run db:pg:pull  # Pull updated schema
# Types will be auto-generated from schema
```

### 2. Verify Type Changes

Check that `RePin` and `ReForm` types now have camelCase properties:

```typescript
// utils/globalTypes.ts
export type RePin = Database['public']['Tables']['pins']['Row'];

// Should now have:
// - createdAt (not created_at)
// - updatedAt (not updated_at)
// - cityVillage (not city_village)
// - images: string (not string[])
```

### 3. Update TODOs in API Files

The following files have TODO comments to update after migration:

**apis/Pins/index.ts:**

```typescript
// TODO: Update to camelCase field names after db:pg:push
// Change:
const { last_synced_at, ... } = pin;
// To:
const { lastSyncedAt, ... } = pin;
```

**apis/Forms/index.ts:**

```typescript
// Same changes needed
```

### 4. Delete Conversion Utilities

```bash
# These files are no longer needed
rm shared/utils/caseConversion.ts
rm shared/utils/fieldMappings.ts

# Update index
# Edit shared/utils/index.ts and remove exports
```

### 5. Test Sync Operations

1. **Test Pin Sync**

   - Create a new pin on mobile
   - Verify it syncs to Supabase
   - Check data format in database

2. **Test Form Sync**

   - Create a form
   - Verify sync works
   - Check array fields are JSON strings

3. **Test Fetch**
   - Pull data from Supabase
   - Verify no conversion errors
   - Check data renders correctly

### 6. Monitor for Issues

- Check app logs for sync errors
- Monitor Supabase logs for query errors
- Watch for any case sensitivity issues

## Rollback Plan

If something goes wrong:

### 1. Restore from Backup

```bash
# Via Supabase Dashboard:
# 1. Go to Database → Backups
# 2. Select the pre-migration backup
# 3. Click "Restore"
```

### 2. Revert Code Changes

```bash
git revert HEAD  # If migration code was committed
# Or restore from backup if needed
```

### 3. Re-add Conversion Utilities

```bash
git checkout HEAD~1 -- shared/utils/caseConversion.ts
git checkout HEAD~1 -- shared/utils/fieldMappings.ts
```

## Verification Queries

After migration, run these to verify data integrity:

```sql
-- Check pins table structure
\d pins

-- Check forms table structure
\d forms

-- Verify images are JSON strings
SELECT id, images FROM pins LIMIT 5;
-- Should see: ["image1.jpg", "image2.jpg"] as text, not {image1.jpg,image2.jpg}

-- Verify forms arrays are JSON strings
SELECT id, "waterSources", "longTermConditions" FROM forms LIMIT 5;
-- Should see: ["source1", "source2"] as text

-- Count total records (should match pre-migration)
SELECT
  (SELECT COUNT(*) FROM pins) as pin_count,
  (SELECT COUNT(*) FROM forms) as form_count,
  (SELECT COUNT(*) FROM sync_queue) as queue_count;
```

## Troubleshooting

### Issue: "Column does not exist"

**Cause:** Old code trying to use snake_case columns

**Fix:** Update code to use camelCase field names

### Issue: "JSON parse error"

**Cause:** Trying to parse array data as JSON

**Fix:** Arrays are now JSON strings - use `JSON.parse(value)` in code

### Issue: "Type error" in TypeScript

**Cause:** Type definitions not regenerated

**Fix:** Regenerate types (see step 1 above)

### Issue: Sync failing

**Cause:** Mismatch between mobile code and database

**Fix:** Ensure all devices have updated app version

## Benefits After Migration

✅ **Simpler Code**

- No more case conversion utilities (~110 lines removed)
- No more array field mapping (~60 lines removed)
- Total: ~240 lines of code eliminated

✅ **Better Performance**

- Zero conversion overhead on every sync operation
- Faster data processing
- Less CPU/battery usage on mobile

✅ **Fewer Bugs**

- No case conversion bugs
- No array parsing errors
- Single source of truth

✅ **Better DX**

- Consistent camelCase everywhere
- Simpler mental model
- Less cognitive load

## Timeline

| Phase       | Duration | Description                |
| ----------- | -------- | -------------------------- |
| Preparation | 15 min   | Backup, review script      |
| Migration   | 1-5 min  | Run SQL script             |
| Type Regen  | 1 min    | Regenerate types           |
| Code Update | 10 min   | Update TODOs, delete utils |
| Testing     | 30 min   | Test sync operations       |
| Monitoring  | 24 hrs   | Watch for issues           |

## Questions?

If you encounter issues:

1. Check this guide first
2. Review migration script
3. Check database logs
4. Check app logs
5. Consider rollback if critical

## References

- Migration Script: `drizzle/postgresql/0013_unified_camelcase_migration.sql`
- Updated Schemas: `db/schema/postgresql.ts`, `db/schema/sqlite.ts`
- Schema Builders: `db/schema/shared.ts`
- Updated APIs: `apis/Pins/index.ts`, `apis/Forms/index.ts`
