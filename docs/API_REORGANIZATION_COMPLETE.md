# API Folder Reorganization - October 18, 2025

## Final State: APIs Folder Completely Removed

After thorough analysis and reorganization, the **entire `apis/` folder has been removed**. All APIs have been moved closer to their consumers for maximum cohesion.

## Journey Summary

### Phase 1: Move Single-Consumer APIs (Earlier)

- **OfflinePacks APIs** → `hooks/OfflinePacks/`
  - Only used by hooks in that folder
  - Thin wrappers around @rnmapbox/maps
- **Images API** → `services/sync/logic/images/`
  - Only used by ImageManager
  - Supabase storage operations

### Phase 2: Remove Redundant Methods

- **Deleted `updateFieldsBatch`** from Pins and Forms APIs
  - Identical implementation to `upsertAll`
  - ~40 lines of duplicate code removed

### Phase 3: Split Multi-Consumer APIs (Final)

After Phase 2, the Pins and Forms APIs only contained:

- `upsertOne` - Used by SyncQueueManager
- `deletePin/deleteForm` - Used by SyncQueueManager

Meanwhile, `fetchAll` and `upsertAll` were only used by repositories through BaseRemoteRepository pattern.

**Decision**: Since the APIs served **two distinct concerns**, we split them:

#### Queue-Specific Operations → `services/sync/queue/api/`

**Moved:**

- `apis/Pins/index.ts` → `services/sync/queue/api/pins.ts`
- `apis/Forms/index.ts` → `services/sync/queue/api/forms.ts`

**Methods:**

- `upsertOne(item)` - Sync individual items via queue
- `deletePin/deleteForm(id)` - Soft delete via queue

**Consumer:**

- Only SyncQueueManager uses these
- Co-located with queue logic
- Clear separation of queue operations

#### Repository Operations → Inlined in Repositories

**Changed:**

- `SupabasePinRepo` - Inlined `fetchAll` and `upsertAll`
- `SupabaseFormRepo` - Inlined `fetchAll` and `upsertAll`

**Rationale:**

- Only 2 simple methods per repository
- Direct Supabase calls, no complex logic
- No need for separate API module
- Better encapsulation

## New Structure

```
[DELETED] apis/
  ├── [MOVED] OfflinePacks/ → hooks/OfflinePacks/
  ├── [MOVED] images.ts → services/sync/logic/images/
  ├── [MOVED] Pins/ → services/sync/queue/api/pins.ts
  └── [MOVED] Forms/ → services/sync/queue/api/forms.ts

✅ services/sync/queue/api/
   ├── pins.ts (upsertOne, deletePin)
   └── forms.ts (upsertOne, deleteForm)

✅ services/sync/repositories/
   ├── pins/SupabasePinRepo.ts (inlined fetchAll, upsertAll)
   └── forms/SupabaseFormRepo.ts (inlined fetchAll, upsertAll)

✅ hooks/OfflinePacks/
   ├── createOfflinePack.ts
   ├── deleteOfflinePack.ts
   └── fetchOfflinePacks.ts

✅ services/sync/logic/images/
   └── images.ts (uploadToRemote, deleteImage, listFilesInBucket)
```

## Benefits

### ✅ Perfect Cohesion

Every API is now **exactly where it's used**:

- Queue operations in queue folder
- Repository operations in repository classes
- Hook operations in hooks folder
- Image operations with ImageManager

### ✅ Clear Boundaries

- **Queue API**: Individual item operations for offline queue
- **Repository methods**: Bulk operations for bidirectional sync
- No more confusion about which method to use for what

### ✅ Reduced Coupling

- SyncQueueManager doesn't depend on generic API layer
- Repositories don't depend on external API modules
- Each module is self-contained

### ✅ Better Discoverability

- Want to add queue operation? Look in `queue/api/`
- Want to modify sync logic? It's in the repository
- No more hunting across `apis/` folder

### ✅ Simplified Architecture

Before:

```
App → APIs (centralized) → Supabase
      ↑         ↑
      |         |
  Queue    Repositories
```

After:

```
Queue → queue/api → Supabase
Repositories → Direct Supabase calls
```

## Migration Guide

### For Queue Operations:

```typescript
// OLD
import * as PinsAPI from '~/apis/Pins';
import * as FormsAPI from '~/apis/Forms';

await PinsAPI.upsertOne(pin);
await FormsAPI.deleteForm(formId);

// NEW (only in SyncQueueManager)
import * as PinsAPI from './api/pins';
import * as FormsAPI from './api/forms';

await PinsAPI.upsertOne(pin);
await FormsAPI.deleteForm(formId);
```

### For Repository Operations:

```typescript
// OLD
import { callPin } from '~/apis';
export class SupabasePinRepo extends BaseRemoteRepository<RePin> {
  constructor() {
    super(callPin);
  }
}

// NEW
import { supabase } from '~/services/supabase';
export class SupabasePinRepo implements RemoteRepository<RePin> {
  async fetchAll(): Promise<RePin[]> {
    const { data } = await supabase.from('pins').select('*');
    return data as RePin[];
  }

  async upsertAll(pins: Partial<RePin>[]): Promise<void> {
    await supabase.from('pins').upsert(pins, { onConflict: 'id' });
  }
}
```

## What Got Removed

1. **Entire `apis/` folder** - No longer needed
2. **BaseRemoteRepository** - Repositories now implement interface directly
3. **API abstraction layer** - Direct Supabase calls where appropriate
4. **Duplicate methods** - updateFieldsBatch eliminated

## Files Modified

### Moved:

1. `apis/Pins/index.ts` → `services/sync/queue/api/pins.ts`
2. `apis/Forms/index.ts` → `services/sync/queue/api/forms.ts`

### Updated:

3. `services/sync/queue/SyncQueueManager.ts` - Import from `./api/*`
4. `services/sync/repositories/pins/SupabasePinRepo.ts` - Inlined methods
5. `services/sync/repositories/forms/SupabaseFormRepo.ts` - Inlined methods

### Deleted:

6. `apis/` folder (entire directory)

## Result

The codebase now follows the **"APIs live with their consumers"** principle consistently:

- ✅ No centralized API folder
- ✅ No unnecessary abstraction layers
- ✅ Maximum cohesion
- ✅ Clear separation of concerns

**Less code, better organization, same functionality!** 🎉
