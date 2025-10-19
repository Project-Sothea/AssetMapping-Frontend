# Sync System Migration Guide

## What Changed

The old repository-based sync system has been completely removed in favor of the simplified queue-based sync system.

## Removed Components

### Files Deleted

- `services/sync/syncService.ts` - Old initialization service
- `services/sync/SyncManager.ts` - Old sync orchestration manager
- `services/sync/logic/` - All sync handlers and strategies
- `services/sync/repositories/` - Old repository interfaces and implementations
- `services/sync/utils/` - Old utility functions
- `services/sync/__tests__/` - Old test files

### Functions Removed

- `initializeSync()` / `initializeDefaultSync()` - No longer needed
- `getSyncManager()` - Replaced by queue functions
- `getLocalPinRepo()` / `getLocalFormRepo()` - Use direct DB access
- `SyncManager.syncNow()` - Replaced by `processQueue()`

## New System

### Import Path

```typescript
import { enqueuePin, enqueueForm, processQueue, getQueueMetrics } from '~/services/sync/queue';
```

### Key Functions

#### Queue Operations

```typescript
// Queue a pin for sync
await enqueuePin('create', pinData);
await enqueuePin('update', pinData);
await enqueuePin('delete', { id: pinId });

// Queue a form for sync
await enqueueForm('create', formData);
await enqueueForm('update', formData);
await enqueueForm('delete', { id: formId });
```

#### Processing

```typescript
// Process all pending operations
await processQueue();

// Get queue health metrics
const metrics = await getQueueMetrics();
// Returns: { pending: number, failed: number, completed: number }
```

#### Maintenance

```typescript
import { retryFailed, cleanupOld } from '~/services/sync/queue';

// Retry all failed operations
await retryFailed();

// Clean up completed operations
await cleanupOld();
```

## Migration Examples

### Before (Old System)

```typescript
// Initialize sync
initializeDefaultSync();

// Manual sync
const syncManager = getSyncManager();
await syncManager.syncNow();

// Subscribe to sync status
syncManager.subscribe((state) => {
  console.log('Sync state:', state);
});
```

### After (New System)

```typescript
// No initialization needed - queue is always ready

// Manual sync (process queue)
await processQueue();

// Monitor queue status
const metrics = await getQueueMetrics();
console.log(`${metrics.pending} pending, ${metrics.failed} failed`);

// Poll for updates (as in SyncStatusBar component)
setInterval(async () => {
  const metrics = await getQueueMetrics();
  // Update UI with metrics
}, 3000);
```

## Benefits of New System

1. **Simpler** - No complex initialization or dependency injection
2. **Offline-first** - Queue operations work offline automatically
3. **Better retry logic** - Built-in exponential backoff and error handling
4. **Idempotent** - Duplicate operations are automatically deduplicated
5. **Observable** - Easy to monitor queue health and status
6. **Testable** - Simpler architecture makes testing easier

## Updated Files

### `/hooks/useRealTimeSync.ts`

- Replaced `getSyncManager().syncNow()` with `processQueue()`
- Removed dependency on old sync service

### `/app/_layout.tsx`

- Removed `initializeDefaultSync()` call
- Queue system requires no initialization

### `/features/sync/components/SyncStatusBar.tsx`

- Replaced sync manager status with queue metrics
- Simplified status calculation based on queue health
- Updated UI to show pending/failed counts

## Notes

- The queue system automatically handles image uploads
- Operations are processed in FIFO order with retry logic
- Failed operations can be retried manually with `retryFailed()`
- The system uses SQLite for persistent queue storage
