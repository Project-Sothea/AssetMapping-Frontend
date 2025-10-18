# API Cleanup - October 18, 2025

## Overview

Reorganized the `apis/` folder to improve cohesion by moving APIs closer to their consumers, reducing coupling and making the codebase more maintainable.

## Changes Made

### 🚚 Moved Files

#### 1. **OfflinePacks APIs** → `hooks/OfflinePacks/`

**Files Moved:**

- `apis/OfflinePacks/createOfflinePack.ts` → `hooks/OfflinePacks/createOfflinePack.ts`
- `apis/OfflinePacks/deleteOfflinePack.ts` → `hooks/OfflinePacks/deleteOfflinePack.ts`
- `apis/OfflinePacks/fetchOfflinePacks.ts` → `hooks/OfflinePacks/fetchOfflinePack.ts`

**Rationale:**

- These files are thin wrappers around `@rnmapbox/maps` offlineManager
- **Only used by hooks** in `hooks/OfflinePacks/` (useCreatePack, useDeletePack, useFetchPacks)
- No other parts of the codebase reference them
- Moving them to the hooks folder increases cohesion - related functionality is now co-located

**Updated Imports:**

- `hooks/OfflinePacks/useCreatePack.ts` - Changed from `~/apis/OfflinePacks/createOfflinePack` to `./createOfflinePack`
- `hooks/OfflinePacks/useDeletePack.ts` - Changed from `~/apis/OfflinePacks/deleteOfflinePack` to `./deleteOfflinePack`
- `hooks/OfflinePacks/useFetchPacks.ts` - Changed from `~/apis/OfflinePacks/fetchOfflinePacks` to `./fetchOfflinePacks`

#### 2. **Images API** → `services/sync/logic/images/`

**Files Moved:**

- `apis/images.ts` → `services/sync/logic/images/images.ts`

**Rationale:**

- Contains Supabase storage operations: `uploadToRemote`, `deleteImage`, `listFilesInBucket`
- **Only used by ImageManager** in `services/sync/logic/images/ImageManager.ts`
- No other parts of the codebase reference it
- Moving it to the images folder increases cohesion - image-related code is now together

**Updated Imports:**

- `services/sync/logic/images/ImageManager.ts` - Changed from `~/apis` to `./images`

### 📁 Remaining APIs (Not Moved)

#### **Pins API** (`apis/Pins/index.ts`)

**Methods:**

- `fetchAll()` - Fetch all pins from Supabase
- `upsertAll()` - Upsert multiple pins
- `updateFieldsBatch()` - Update specific fields (used for image sync)
- `upsertOne()` - Upsert single pin (used by queue system)
- `deletePin()` - Soft delete pin (used by queue system)

**Used By:**

- `BaseRemoteRepository` (via SupabasePinRepo) - fetchAll, upsertAll, updateFieldsBatch
- `SyncQueueManager` - upsertOne, deletePin
- `PinSyncHandler` - updateFieldsBatch (for image field updates)

**Rationale for Keeping:**

- Multiple consumers across different layers (repositories, queue, handlers)
- Central API layer pattern appropriate here
- Shared by different concerns (bulk sync, queue operations, field updates)

#### **Forms API** (`apis/Forms/index.ts`)

**Methods:**

- `fetchAll()` - Fetch all forms from Supabase
- `upsertAll()` - Upsert multiple forms
- `updateFieldsBatch()` - Update specific fields
- `upsertOne()` - Upsert single form (used by queue system)
- `deleteForm()` - Soft delete form (used by queue system)

**Used By:**

- `BaseRemoteRepository` (via SupabaseFormRepo) - fetchAll, upsertAll, updateFieldsBatch
- `SyncQueueManager` - upsertOne, deleteForm

**Rationale for Keeping:**

- Multiple consumers across different layers
- Central API layer pattern appropriate here
- Shared by different concerns

### 🗑️ Removed

#### Phase 1: Directories and Exports

- `apis/OfflinePacks/` directory (now empty)
- `apis/images.ts` export from `apis/index.ts`

#### Phase 2: Redundant Methods

- `updateFieldsBatch()` from `apis/Pins/index.ts`
- `updateFieldsBatch()` from `apis/Forms/index.ts`
- `updateFieldsBatch()` from `BaseRemoteRepository` class
- `updateFieldsBatch()` from `RemoteRepository` interface

**Why removed?**
`updateFieldsBatch` had identical implementation to `upsertAll`:

```typescript
// Both methods did the same thing:
// 1. Strip local-only fields
// 2. Call supabase.upsert(items, { onConflict: 'id' })
// 3. Handle errors

// The only difference was the parameter name!
```

**Migration:**

- `upsertAll` signature changed from `T[]` to `Partial<T>[]`
- Now handles both full entities and partial updates
- PinSyncHandler updated to use `upsertAll` instead of `updateFieldsBatch`

### ✅ Removed Redundant Methods

**Removed `updateFieldsBatch` from Pins and Forms APIs:**

- **Reason**: Identical implementation to `upsertAll` - both use `supabase.upsert()` with same logic
- **Impact**:
  - Deleted from `apis/Pins/index.ts` (~20 lines)
  - Deleted from `apis/Forms/index.ts` (~20 lines)
  - Removed from `BaseRemoteRepository` interface
  - Removed from `RemoteRepository` interface
  - Updated `PinSyncHandler` to use `upsertAll` instead
- **Benefit**: Less code duplication, clearer API surface

**Remaining API methods (all actively used):**

- `fetchAll` → Used by BaseRemoteRepository pattern for bulk sync
- `upsertAll` → Used by BaseRemoteRepository for bulk updates & partial field updates
- `upsertOne` → Used by SyncQueueManager for individual queue operations
- `deletePin/deleteForm` → Used by SyncQueueManager for soft delete operations

## New Structure

```
apis/
├── index.ts              ← Exports only Pins and Forms
├── Pins/
│   └── index.ts          ← Supabase pin operations (shared by multiple consumers)
└── Forms/
    └── index.ts          ← Supabase form operations (shared by multiple consumers)

hooks/
└── OfflinePacks/
    ├── createOfflinePack.ts   ← MOVED: Mapbox pack creation
    ├── deleteOfflinePack.ts   ← MOVED: Mapbox pack deletion
    ├── fetchOfflinePacks.ts   ← MOVED: Mapbox pack fetching
    ├── types.ts               ← Pack type definitions
    ├── useCreatePack.ts       ← Hook using createOfflinePack
    ├── useDeletePack.ts       ← Hook using deleteOfflinePack
    └── useFetchPacks.ts       ← Hook using fetchOfflinePacks

services/sync/logic/images/
├── ImageManager.ts       ← Image management logic
├── images.ts             ← MOVED: Supabase storage operations
├── index.ts              ← Exports
└── types.ts              ← Image types
```

## Benefits

### ✅ Increased Cohesion

- **OfflinePacks**: All offline pack code (APIs + hooks + types) now in one folder
- **Images**: All image-related code (manager + storage API) now together
- Related functionality is co-located, easier to understand and maintain

### ✅ Reduced Coupling

- Removed unnecessary cross-folder dependencies
- Clearer boundaries between different features
- LocalOnly APIs (single consumer) moved to consumer location

### ✅ Better Organization

- `apis/` folder now only contains **shared, multi-consumer APIs**
- Feature-specific APIs moved to their feature folders
- Clear pattern: If API has single consumer, co-locate; if multiple consumers, centralize

### ✅ Easier to Navigate

- OfflinePacks developers: Everything in `hooks/OfflinePacks/`
- Image developers: Everything in `services/sync/logic/images/`
- No jumping between `apis/` and feature folders

## Design Principles Applied

1. **High Cohesion**: Related code should live together
2. **Low Coupling**: Reduce unnecessary cross-folder dependencies
3. **Single Consumer Pattern**: If API has only one consumer, move it to consumer's location
4. **Multi-Consumer Pattern**: Keep centralized for shared APIs (Pins, Forms)

## Migration Notes

### If you were importing OfflinePacks APIs:

```typescript
// OLD (no longer works)
import { CreateOfflinePack } from '~/apis/OfflinePacks/createOfflinePack';

// NEW
import { CreateOfflinePack } from '~/hooks/OfflinePacks/createOfflinePack';
// Or use the hooks directly (recommended)
import useCreatePack from '~/hooks/OfflinePacks/useCreatePack';
```

### If you were importing images API:

```typescript
// OLD (no longer works)
import { callImages } from '~/apis';

// NEW
import * as callImages from '~/services/sync/logic/images/images';
// Note: Only ImageManager should use this directly
```

## Summary

### Phase 1: Reorganization (Moving APIs)

- **Moved**: 4 files (3 OfflinePacks + 1 images)
- **Updated imports**: 4 files
- **Removed**: 2 items (directory + export)

### Phase 2: Deduplication (Removing Redundant Methods)

- **Deleted**: `updateFieldsBatch` from Pins and Forms APIs (~40 lines of duplicate code)
- **Updated**: 5 files (BaseRemoteRepository, RemoteRepository, PinSyncHandler, Pins API, Forms API)
- **Reason**: `updateFieldsBatch` was identical to `upsertAll` - both used `supabase.upsert()`
- **Updated signature**: `upsertAll` now accepts `Partial<T>[]` (was `T[]`) for flexibility

### Result

- **Cleaner codebase**: Removed ~40 lines of duplicate code
- **Better organization**: APIs co-located with consumers
- **Clearer API surface**: One method for upserts (full or partial)
- **Same functionality**: No behavioral changes, just less redundancy! 🎉
