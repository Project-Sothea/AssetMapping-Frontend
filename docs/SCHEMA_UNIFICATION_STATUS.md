# Schema Unification Status Report

## ✅ Completed

### 1. PostgreSQL (Supabase Remote) - MIGRATED

- **Status**: ✅ Fully migrated to camelCase + JSON strings
- **Migration**: Applied via manual psql on Oct 18, 2025
- **Records Migrated**: 27 pins, 17 forms
- **Columns**: All columns now use camelCase (`createdAt`, `cityVillage`, etc.)
- **Arrays**: All stored as JSON TEXT strings
- **Schema File**: `db/schema/postgresql.ts` matches database

### 2. Code Organization

- **✅ Deleted**: Outdated `db/schema.ts` with wrong field names
- **✅ Created**: `db/types.ts` - Central type definitions separating local/remote types
- **✅ Updated**: `utils/globalTypes.ts` - Now re-exports from db/types.ts
- **✅ Cleaned**: Removed deprecated `FIELD_NAMES` constants from `db/schema/shared.ts`
- **✅ Organized**: All schema code now in `db/schema/` folder

### 3. Type System

- **Separate Types**: `LocalPin`/`RemotePin`, `LocalForm`/`RemoteForm`
- **Why**: PostgreSQL is camelCase, SQLite is still snake_case
- **Exports**: Main exports (`Pin`, `Form`) point to local types for app code
- **Location**: All types defined in `db/types.ts` for better cohesion

### 4. Transformers

- **✅ pinTransformers**: Updated to handle local(snake_case) ↔ remote(camelCase) conversion
- **✅ formTransformers**: Simplified since TypeScript types already camelCase
- **Status**: Working correctly with current database states

## ⏳ Pending

### SQLite (Local) - SCHEMA READY

- **Status**: ✅ Clean camelCase schema generated
- **Migration File**: `drizzle/sqlite/0000_init_camelcase.sql`
- **Schema State**: All columns use camelCase (`cityVillage`, `createdAt`, etc.)
- **Action Required**:
  - For NEW databases: Migration will auto-apply on first run
  - For EXISTING databases with data: Need to run a separate column rename migration

## ✅ Drizzle Migrations Cleaned Up

**All old snake_case migrations have been removed!**

The `drizzle/` folder now contains only the clean, unified camelCase schemas:

```
drizzle/
├── postgresql/
│   ├── 0000_init_camelcase.sql  ← CREATE TABLE with camelCase
│   └── meta/
└── sqlite/
    ├── 0000_init_camelcase.sql  ← CREATE TABLE with camelCase
    └── meta/
```

**Benefits:**

- ✅ Clean starting point for new databases
- ✅ All columns use camelCase from the start
- ✅ No migration history clutter
- ✅ Matches the unified schema architecture

## 📋 Required Actions

### For Fresh Development (New Databases)

**✅ No action needed!** The migrations will auto-apply when the app creates the database for the first time. Everything uses camelCase from the start.

### For Existing Databases (With Data)

If you have an existing SQLite database with snake_case columns, you need to migrate it:

**Option 1: Create Migration Script**
Generate a new migration that renames existing columns:

```bash
# This will detect differences between current DB and schema
npx drizzle-kit generate
```

Then apply the migration in your app.

**Option 2: Fresh Start (Development Only)**
Delete the local database and let it recreate with the new schema:

```typescript
// WARNING: This deletes all local data!
import * as FileSystem from 'expo-file-system';

const dbPath = `${FileSystem.documentDirectory}SQLite/assetmap.db`;
await FileSystem.deleteAsync(dbPath, { idempotent: true });
// Restart app - new DB will be created with camelCase
```

**⚠️ For Production:** Never delete user data! Always use Option 1.

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│  Uses: Pin, Form (from ~/utils/globalTypes)                 │
│  TypeScript Properties: camelCase                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌────────────────────┐      ┌────────────────────┐
│   LOCAL (SQLite)   │      │ REMOTE (PostgreSQL)│
│                    │      │                    │
│ Type: LocalPin     │      │ Type: RemotePin    │
│ TS Props: camelCase│      │ TS Props: camelCase│
│ DB Cols: snake_case│      │ DB Cols: camelCase │
│ Status: ⏳ PENDING │      │ Status: ✅ DONE    │
└────────────────────┘      └────────────────────┘
         │                           │
         └───────────┬───────────────┘
                     ▼
         ┌───────────────────────┐
         │    TRANSFORMERS       │
         │ pinTransformers.ts    │
         │ formTransformers.ts   │
         │                       │
         │ Convert between:      │
         │ • snake_case ↔ camelCase │
         │ • Local ↔ Remote      │
         └───────────────────────┘
```

## 🎯 Recommendations

1. **Immediate**: Apply SQLite migration before next app start
2. **Testing**: Verify all CRUD operations work after migration
3. **Rollback Plan**: Keep backup of old database schema
4. **Future**: After migration, simplify transformers (no case conversion needed)

## 📝 Files Modified

### Created

- `db/types.ts` - Central type definitions
- `drizzle/sqlite/0001_camelcase_migration.sql` - SQLite migration script

### Modified

- `db/schema/shared.ts` - Removed deprecated FIELD_NAMES
- `utils/globalTypes.ts` - Now re-exports from db/types.ts
- `shared/utils/pinTransformers.ts` - Handles local↔remote conversion
- `shared/utils/formTransformers.ts` - Simplified with correct types

### Deleted

- `db/schema.ts` - Outdated schema with wrong field names

## 🔗 Next Steps

1. Review this document
2. Choose migration approach (Option A recommended)
3. Apply SQLite migration
4. Test all features (create/read/update/delete pins and forms)
5. Verify sync operations work correctly
6. After successful migration, can further simplify transformers
