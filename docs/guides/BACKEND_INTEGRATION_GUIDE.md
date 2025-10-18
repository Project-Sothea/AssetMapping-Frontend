# Backend Integration Guide: Connecting Queue to Supabase

## Overview

You mentioned **"I don't have a backend, only Supabase"** - that's perfect! Supabase **IS** your backend. This guide explains how to connect the queue system to your Supabase PostgreSQL database.

---

## Architecture Understanding

```
┌─────────────────────────────────────────────────────────────┐
│                    Your App Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  React Native App (Frontend)                                │
│  ├─ SQLite Database (Local - Offline Storage)               │
│  │   └─ Tables: pins, forms, sync_queue                     │
│  │                                                           │
│  └─ Sync Queue System                                        │
│      ├─ Enqueues operations when offline/online             │
│      └─ Processes queue → Sends to backend                  │
│                          ↓                                   │
│                    Supabase (Backend)                        │
│                    ├─ PostgreSQL Database (Remote)           │
│                    │   └─ Tables: pins, forms                │
│                    ├─ Auth (User authentication)             │
│                    ├─ Realtime (Live updates)                │
│                    └─ Storage (File uploads)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**

1. **SQLite = Local database** (your phone, offline-first)
2. **Supabase PostgreSQL = Remote database** (cloud, shared across devices)
3. **Queue System = Bridge** (syncs local → remote when online)

---

## Current State Analysis

### What You Have ✅

1. **Supabase APIs** (`apis/Forms/index.ts`, `apis/Pins/index.ts`):

   ```typescript
   // Forms
   export const fetchAll = async () => { ... }
   export const upsertAll = async (forms: ReForm[]) => { ... }
   export const updateFieldsBatch = async (forms: Partial<ReForm>[]) => { ... }

   // Pins
   export const fetchAll = async () => { ... }
   export const upsertAll = async (pins: RePin[]) => { ... }
   export const updateFieldsBatch = async (pins: Partial<RePin>[]) => { ... }
   ```

2. **Supabase Client** (`services/supabase.ts`):

   ```typescript
   import { createClient } from '@supabase/supabase-js';
   export const supabase = createClient(url, anonKey);
   ```

3. **Queue System** (Phase 1 complete):
   - Enqueues operations locally
   - Processes queue with retry logic
   - Currently **simulates** backend calls

### What's Missing ❌

1. **No DELETE operations** in your Supabase APIs
2. **Queue → API connection** (simulateBackendSync needs replacing)
3. **Individual operation handling** (APIs use batch upsert, queue needs single operations)

---

## Step-by-Step Integration

### Step 1: Add DELETE APIs to Supabase

First, let's add delete methods since they don't exist:

**File: `apis/Pins/index.ts`**

```typescript
export const deletePin = async (pinId: string) => {
  try {
    const { error } = await supabase.from('pins').delete().eq('id', pinId);

    if (error) throw error;
  } catch (e) {
    console.error('Failed to delete pin:', e);
    throw new Error('Error deleting pin from remote DB');
  }
};
```

**File: `apis/Forms/index.ts`**

```typescript
export const deleteForm = async (formId: string) => {
  try {
    const { error } = await supabase.from('forms').delete().eq('id', formId);

    if (error) throw error;
  } catch (e) {
    console.error('Failed to delete form:', e);
    throw new Error('Error deleting form from remote DB');
  }
};
```

---

### Step 2: Create Single-Item Upsert Methods

Your current APIs use `upsertAll()` for batches. We need individual operations:

**File: `apis/Pins/index.ts`**

```typescript
export const upsertOne = async (pin: RePin) => {
  try {
    // Strip local-only fields
    const { last_synced_at, last_failed_sync_at, status, failure_reason, local_images, ...rest } =
      pin;

    const pinToUpsert = {
      ...rest,
      updated_at: rest.updated_at ?? new Date().toISOString(),
    };

    const { error } = await supabase.from('pins').upsert(pinToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert pin:', e);
    throw new Error('Error upserting pin to remote DB');
  }
};
```

**File: `apis/Forms/index.ts`**

```typescript
export const upsertOne = async (form: ReForm) => {
  try {
    // Strip local-only fields
    const { failure_reason, status, last_synced_at, last_failed_sync_at, ...rest } = form;

    const formToUpsert = {
      ...rest,
      updated_at: rest.updated_at ?? new Date().toISOString(),
    };

    const { error } = await supabase.from('forms').upsert(formToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert form:', e);
    throw new Error('Error upserting form to remote DB');
  }
};
```

---

### Step 3: Replace simulateBackendSync()

Now connect the queue to real Supabase APIs:

**File: `services/sync/queue/SyncQueueManager.ts`**

1. **Add imports at the top:**

```typescript
import * as FormsAPI from '~/apis/Forms';
import * as PinsAPI from '~/apis/Pins';
```

2. **Replace the `simulateBackendSync` method:**

```typescript
/**
 * Send operation to Supabase backend
 */
private async sendToBackend(op: QueueOperation): Promise<void> {
  const payload = JSON.parse(op.payload);

  switch (op.entityType) {
    case 'pin':
      await this.syncPin(op.operation, payload);
      break;
    case 'form':
      await this.syncForm(op.operation, payload);
      break;
    default:
      throw new Error(`Unknown entity type: ${op.entityType}`);
  }
}

/**
 * Sync pin to Supabase
 */
private async syncPin(operation: string, data: any): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update':
      await PinsAPI.upsertOne(data);
      break;
    case 'delete':
      await PinsAPI.deletePin(data.id);
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Sync form to Supabase
 */
private async syncForm(operation: string, data: any): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update':
      await FormsAPI.upsertOne(data);
      break;
    case 'delete':
      await FormsAPI.deleteForm(data.id);
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
```

3. **Update `processOperation` to use real backend:**

Replace line 372:

```typescript
// OLD:
await this.simulateBackendSync(op);

// NEW:
await this.sendToBackend(op);
```

---

### Step 4: Test the Integration

1. **Create a pin offline**:

   - Turn on airplane mode
   - Create a pin in the app
   - See it queued: `"Synced (1 queued)"`

2. **Go back online**:

   - Turn off airplane mode
   - Queue processes automatically
   - Check Supabase dashboard → pin should appear!

3. **Check logs**:
   ```
   📦 Processing 1 queued operations...
   → Processing: CREATE pin:abc123
   ✓ Completed: CREATE pin:abc123
   ✓ Batch complete: 1/1 successful
   ```

---

## Error Handling

### Network Errors (Retriable)

```typescript
// Queue automatically retries these:
-'fetch failed' - 'Network request failed' - 'timeout' - 'ECONNREFUSED';
```

### Conflict Errors (Non-Retriable)

```typescript
// Queue marks as failed (no retry):
-'409 Conflict' - 'Resource conflict';
```

### Supabase Specific Errors

You may need to handle Supabase-specific error codes:

```typescript
private async sendToBackend(op: QueueOperation): Promise<void> {
  try {
    const payload = JSON.parse(op.payload);

    // ... sync logic ...

  } catch (error: any) {
    // Handle Supabase errors
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('Duplicate entry conflict');
    } else if (error.code === 'PGRST301') {
      // JWT expired
      throw new Error('Authentication expired');
    } else {
      throw error;
    }
  }
}
```

---

## Validation Before Sync

Add validation to ensure data quality:

```typescript
private async syncPin(operation: string, data: any): Promise<void> {
  // Validate required fields
  if (!data.id) {
    throw new Error('Pin ID is required');
  }

  if (operation !== 'delete' && (!data.lat || !data.lng)) {
    throw new Error('Pin coordinates are required');
  }

  // Proceed with sync
  switch (operation) {
    // ... rest of code
  }
}
```

---

## Summary

### What to Do:

1. ✅ **Add delete APIs** to `apis/Pins/index.ts` and `apis/Forms/index.ts`
2. ✅ **Add upsertOne methods** for single-item operations
3. ✅ **Replace simulateBackendSync()** with `sendToBackend()` that calls Supabase
4. ✅ **Test offline → online sync** flow
5. ✅ **Monitor logs** for errors

### What You Get:

- ✅ **Offline-first**: Works without internet
- ✅ **Auto-sync**: Queues sync when online
- ✅ **Retry logic**: Handles network failures
- ✅ **Idempotency**: No duplicate syncs
- ✅ **Real-time**: Supabase realtime still works

### Estimated Time:

- **30-45 minutes** to implement
- **15 minutes** to test
- **Total: ~1 hour**

---

## Next Steps

After integration:

1. Test create/update/delete for both pins and forms
2. Test offline → online scenarios
3. Monitor Supabase dashboard for data
4. Check queue metrics: `getQueueHealth()`
5. Handle edge cases (auth expiry, conflicts, etc.)

Ready to implement? I can help you make these changes! 🚀
