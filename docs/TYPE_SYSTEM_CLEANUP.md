# Type System Cleanup - October 18, 2025

## Overview

Cleaned up and reorganized the type system to improve cohesion and reduce redundancy. All types are now organized closer to their relevant features.

## Changes Made

### 🗑️ Deleted Files

1. **`utils/database.types.ts`**

   - **Reason**: Not used anywhere in the codebase
   - **Was**: Supabase-generated types (outdated)
   - **Replacement**: Use Drizzle schema types from `~/db/types`

2. **`utils/dataShapes.ts`**
   - **Reason**: Deprecated case conversion functions + array utilities moved to better location
   - **Was**: Case conversion (no-ops) + array stringify/parse functions
   - **Replacement**: Moved to `~/db/utils`

### ✨ Created Files

1. **`db/utils.ts`** - Database utility functions

   - `stringifyArrayFields()` - Convert arrays to JSON strings for SQLite
   - `parseArrayFields()` - Parse JSON strings back to arrays
   - Clean, well-documented, focused on database operations

2. **`hooks/OfflinePacks/types.ts`** - Offline pack types
   - `CreateOfflinePackProps` - Type for creating Mapbox packs
   - `UseCreatePackProps` - Alias (deprecated)
   - Co-located with offline pack hooks

### 📝 Updated Files

1. **`utils/globalTypes.ts`**
   - **Before**: Re-exported database types + Mapbox types
   - **After**: Only re-exports database types for backward compatibility
   - **Deprecated**: Marked file for future removal
   - **Recommendation**: Import directly from source (`~/db/types`, `~/hooks/OfflinePacks/types`)

### 🔄 Updated Imports

All imports updated to use new locations:

**Database Utilities** (`db/utils`):

- `services/sync/logic/syncing/SyncStrategy.ts`
- `shared/utils/formTransformers.ts`
- `services/sync/repositories/forms/DrizzleFormRepo.ts`
- `features/forms/components/Form/Form.tsx`

**Offline Pack Types** (`hooks/OfflinePacks/types`):

- `hooks/OfflinePacks/useCreatePack.ts`
- `features/sync/components/OfflinePacks/CreatePackForm.tsx`
- `apis/OfflinePacks/createOfflinePack.ts`

## Benefits

### ✅ Improved Cohesion

- **Database utilities** → `db/` folder (with schemas and types)
- **Offline pack types** → `hooks/OfflinePacks/` (with hooks)
- Related code is now co-located

### ✅ Reduced Redundancy

- Deleted unused `database.types.ts`
- Removed deprecated no-op case conversion functions
- Single source of truth for each type category

### ✅ Clearer Organization

```
db/
├── types.ts          ← All database entity types
├── utils.ts          ← Database utility functions (NEW)
└── schema/           ← Drizzle schemas

hooks/
└── OfflinePacks/
    ├── types.ts      ← Offline pack types (NEW)
    └── useCreatePack.ts

utils/
└── globalTypes.ts    ← Deprecated, backward compat only
```

### ✅ Better Developer Experience

- Types are where you'd expect them
- Clear import paths
- Less jumping around the codebase

## Migration Guide

### If you were importing from `utils/dataShapes`:

```typescript
// OLD
import { stringifyArrayFields, parseArrayFields } from '~/utils/dataShapes';

// NEW
import { stringifyArrayFields, parseArrayFields } from '~/db/utils';
```

### If you were importing from `utils/globalTypes`:

```typescript
// OLD (still works, but deprecated)
import { CreateOfflinePackProps } from '~/utils/globalTypes';

// NEW (recommended)
import { CreateOfflinePackProps } from '~/hooks/OfflinePacks/types';

// Database types - import directly
import { Pin, Form, RePin, ReForm } from '~/db/types';
```

## Next Steps

1. **Gradual Migration**: Update imports throughout codebase to use direct paths
2. **Remove globalTypes.ts**: Once all code uses direct imports
3. **Documentation**: Update import guidelines in developer docs

## Files Modified Summary

- **Deleted**: 2 files (`database.types.ts`, `dataShapes.ts`)
- **Created**: 2 files (`db/utils.ts`, `hooks/OfflinePacks/types.ts`)
- **Updated**: 5 files (import paths)
- **Deprecated**: 1 file (`utils/globalTypes.ts`)

**Net result**: Cleaner, more organized codebase with better cohesion! 🎉
