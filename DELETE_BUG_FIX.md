# Delete Operations Bug Fix

## ✅ Fixed: Delete operations were sending undefined ID to Supabase

### Error

```
invalid input syntax for type uuid: "undefined"
```

### Root Cause

Delete helper functions passed empty `data: {}` instead of `data: { id: entityId }`

### Solution

**Changed in `services/sync/queue/helpers.ts`:**

```typescript
// ✅ Before
data: {},

// ✅ After
data: { id: entityId },
```

**Added validation in `SyncQueueManager.ts`:**

```typescript
if (!data.id) {
  throw new Error(`ID is required for ${operation} operation`);
}
```

### Files Modified

- ✅ `services/sync/queue/helpers.ts` - Fixed `enqueuePinDelete()` and `enqueueFormDelete()`
- ✅ `services/sync/queue/SyncQueueManager.ts` - Added validation

### Test

Delete a pin or form - should now sync correctly with `deleted_at` timestamp set in Supabase! ✅
