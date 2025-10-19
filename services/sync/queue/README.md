# Sync Queue

Simplified offline-first sync queue for pins and forms.

## Structure

```
queue/
├── index.ts          # Public API exports
├── syncQueue.ts      # Main queue logic (180 lines)
└── uploadImages.ts   # Image upload utility (70 lines)
```

## Public API

### Enqueue Operations

```typescript
// Queue a pin operation
await enqueuePin('create', pinData);
await enqueuePin('update', pinData);
await enqueuePin('delete', { id: 'pin-id' });

// Queue a form operation
await enqueueForm('create', formData);
await enqueueForm('update', formData);
await enqueueForm('delete', { id: 'form-id' });
```

### Queue Management

```typescript
// Process pending operations (auto-scheduled after enqueue)
await processQueue();

// Get queue health
const metrics = await getQueueMetrics();
// { pending: 3, failed: 1, completed: 10 }

// Retry all failed operations
await retryFailed();

// Clear completed operations
await cleanupOld();
```

## Features

✅ **Simple API** - Just 6 functions  
✅ **Auto-retry** - Network errors retry up to 3 times  
✅ **Image upload** - Automatic upload to Supabase storage  
✅ **Offline-first** - Queue operations work offline  
✅ **Idempotent** - Same operation never executes twice  
✅ **Ordered** - Operations process in sequence

## How It Works

1. **Enqueue**: Operation saved to local SQLite queue
2. **Auto-process**: Queue processes after 2s delay
3. **Upload images**: Local images uploaded to Supabase
4. **Sync to backend**: Operation sent via API
5. **Mark complete**: Operation marked as completed

If sync fails due to network, it automatically retries with backoff.

## Error Handling

- **Network errors**: Auto-retry up to 3 times
- **Other errors**: Marked as failed, manual retry needed
- **Image upload failure**: Clears optimistic UI, marks failed

## Migration from Old API

```typescript
// Old API
await enqueuePinCreate(pin);
await enqueuePinUpdate(id, changes);
await enqueuePinDelete(id);

// New API
await enqueuePin('create', pin);
await enqueuePin('update', { id, ...changes });
await enqueuePin('delete', { id });
```

## Total Code: ~370 lines across 4 files

- `syncQueue.ts`: 183 lines (main queue logic)
- `syncOperations.ts`: 97 lines (pin/form sync)
- `uploadImages.ts`: 73 lines (image upload)
- `index.ts`: 14 lines (exports)

**vs Old implementation: ~1200+ lines across 8+ files**

**Reduction: 70% less code, 50% fewer files**
