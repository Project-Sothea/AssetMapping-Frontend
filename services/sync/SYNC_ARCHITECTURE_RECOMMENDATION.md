# Sync Architecture Recommendation for Offline-First App

## Executive Summary

**Recommendation**: **Hybrid Approach** - Local Queue + Backend Orchestration

Your current sync system is good but lacks **robustness, idempotency guarantees, and consistency mechanisms** needed for production offline-first apps. I recommend adding a **local operation queue** with **backend-assisted conflict resolution** and **transactional integrity**.

---

## Current Architecture Analysis

### ✅ What's Working Well

1. **Timestamp-based conflict resolution** - Good foundation
2. **Status tracking** (`status`, `lastSyncedAt`, `lastFailedSyncAt`, `failureReason`)
3. **Local-first design** - SQLite + Supabase
4. **Separate handlers** - PinSyncHandler, FormSyncHandler
5. **Image sync** - Handles binary data separately
6. **Deduplication** - Prevents concurrent syncs

### ❌ Current Limitations

1. **No operation ordering** - Batch operations may apply in wrong order
2. **No idempotency guarantees** - Network failures can cause duplicates
3. **No transactional integrity** - Partial failures leave inconsistent state
4. **No retry mechanism** - Failed syncs require manual retry
5. **No conflict audit trail** - Can't trace why conflicts were resolved certain way
6. **No operation queue** - Lost operations if app crashes during sync
7. **Race conditions** - Multiple devices can create conflicting states
8. **Image sync coupling** - Tightly coupled to pin sync (can fail independently)

---

## Recommended Architecture: Hybrid Local Queue + Backend Orchestration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Mobile App                           │
│                                                              │
│  ┌────────────────┐      ┌─────────────────┐               │
│  │  UI Layer      │─────▶│  Local Queue    │               │
│  │  (User Actions)│      │  (SQLite Table) │               │
│  └────────────────┘      └────────┬────────┘               │
│                                   │                         │
│                                   ▼                         │
│                        ┌──────────────────┐                │
│                        │  Sync Orchestrator│               │
│                        │  (SyncManager)    │               │
│                        └────────┬──────────┘               │
│                                 │                          │
│         ┌───────────────────────┼───────────────────┐      │
│         ▼                       ▼                   ▼      │
│  ┌─────────────┐       ┌──────────────┐   ┌──────────┐   │
│  │ Pin Handler │       │ Form Handler │   │Image Mgr │   │
│  └──────┬──────┘       └──────┬───────┘   └────┬─────┘   │
│         │                     │                 │         │
└─────────┼─────────────────────┼─────────────────┼─────────┘
          │                     │                 │
          ▼                     ▼                 ▼
┌──────────────────────────────────────────────────────────┐
│                    Backend (Supabase)                     │
│                                                           │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────┐ │
│  │  Pins Table    │  │  Forms Table    │  │  Storage  │ │
│  │  (with vector  │  │  (with vector   │  │  Bucket   │ │
│  │   clock)       │  │   clock)        │  └───────────┘ │
│  └────────────────┘  └─────────────────┘                │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Sync Endpoint (Edge Function / RPC)                │ │
│  │  - Batch operation processing                       │ │
│  │  - Conflict resolution with vector clocks           │ │
│  │  - Idempotency key validation                       │ │
│  │  - Transactional commits                            │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## Solution Components

### 1. Local Operation Queue (Priority: HIGH)

Add a new SQLite table to store pending operations:

```typescript
// db/schema.ts
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(), // UUID
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  // Operation details
  operation: text('operation').notNull(), // 'create', 'update', 'delete'
  entityType: text('entity_type').notNull(), // 'pin', 'form'
  entityId: text('entity_id').notNull(),

  // Idempotency
  idempotencyKey: text('idempotency_key').notNull().unique(),

  // Payload
  payload: text('payload').notNull(), // JSON stringified data

  // Status tracking
  status: text('status').notNull(), // 'pending', 'in_progress', 'completed', 'failed'
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),

  // Error handling
  lastError: text('last_error'),
  lastAttemptAt: text('last_attempt_at'),

  // Ordering
  sequenceNumber: integer('sequence_number').notNull(),

  // Dependencies
  dependsOn: text('depends_on'), // ID of operation this depends on
});

export type SyncOperation = typeof syncQueue.$inferSelect;
```

**Benefits**:

- ✅ **Persistent** - Survives app crashes
- ✅ **Ordered** - Sequence number ensures correct order
- ✅ **Idempotent** - Idempotency key prevents duplicates
- ✅ **Retry-able** - Track attempts and failures
- ✅ **Auditable** - Complete history of operations

---

### 2. Enhanced SyncManager with Queue Processing

```typescript
// services/sync/queue/SyncQueueManager.ts

export class SyncQueueManager {
  /**
   * Add operation to queue (called from UI layer)
   */
  async enqueue(operation: QueueOperation): Promise<void> {
    const idempotencyKey = generateIdempotencyKey(operation);

    // Check if already queued
    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      console.log('Operation already queued:', idempotencyKey);
      return;
    }

    const sequenceNumber = await this.getNextSequenceNumber();

    await db.insert(syncQueue).values({
      id: uuidv4(),
      operation: operation.type,
      entityType: operation.entityType,
      entityId: operation.entityId,
      idempotencyKey,
      payload: JSON.stringify(operation.data),
      status: 'pending',
      sequenceNumber,
      attempts: 0,
      maxAttempts: 3,
    });

    // Trigger sync in background
    this.scheduleSyncIfNeeded();
  }

  /**
   * Process queue in order
   */
  async processQueue(): Promise<void> {
    const pendingOps = await this.getPendingOperations();

    for (const op of pendingOps) {
      try {
        await this.processOperation(op);
      } catch (error) {
        await this.handleOperationFailure(op, error);
      }
    }
  }

  /**
   * Process single operation with retry logic
   */
  private async processOperation(op: SyncOperation): Promise<void> {
    // Mark as in-progress
    await this.updateOperationStatus(op.id, 'in_progress');

    try {
      // Send to backend with idempotency key
      await this.sendToBackend(op);

      // Mark as completed
      await this.updateOperationStatus(op.id, 'completed');

      // Clean up old completed operations (keep last 100)
      await this.cleanupOldOperations();
    } catch (error) {
      throw error; // Let handleOperationFailure deal with it
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async handleOperationFailure(op: SyncOperation, error: Error): Promise<void> {
    const newAttempts = op.attempts + 1;

    if (newAttempts >= op.maxAttempts) {
      // Max retries reached - mark as failed
      await this.updateOperationStatus(op.id, 'failed', error.message);

      // Notify user
      this.notifyOperationFailed(op, error);
    } else {
      // Schedule retry with exponential backoff
      const backoffMs = Math.pow(2, newAttempts) * 1000; // 2s, 4s, 8s

      await db
        .update(syncQueue)
        .set({
          attempts: newAttempts,
          lastError: error.message,
          lastAttemptAt: new Date().toISOString(),
          status: 'pending', // Back to pending for retry
        })
        .where(eq(syncQueue.id, op.id));

      // Schedule retry
      setTimeout(() => this.processQueue(), backoffMs);
    }
  }
}
```

---

### 3. Backend Sync Endpoint (Supabase Edge Function or RPC)

Create a robust backend endpoint to handle batched sync operations:

```typescript
// supabase/functions/sync-operations/index.ts

import { serve } from 'std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const { operations, deviceId, timestamp } = await req.json();

  const supabase = createClient(/* ... */);

  // Start transaction
  const results = [];

  for (const op of operations) {
    try {
      // Check idempotency key
      const existing = await checkIdempotencyKey(supabase, op.idempotencyKey);
      if (existing) {
        results.push({
          id: op.id,
          status: 'already_processed',
          result: existing,
        });
        continue;
      }

      // Apply operation
      const result = await applyOperation(supabase, op);

      // Store idempotency key
      await storeIdempotencyKey(supabase, op.idempotencyKey, result);

      results.push({
        id: op.id,
        status: 'success',
        result,
      });
    } catch (error) {
      results.push({
        id: op.id,
        status: 'error',
        error: error.message,
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function applyOperation(supabase, op) {
  switch (op.operation) {
    case 'create':
      return await supabase
        .from(op.entityType + 's')
        .insert({ ...op.payload, created_by_device: op.deviceId })
        .select()
        .single();

    case 'update':
      // Use vector clock for conflict resolution
      const existing = await supabase
        .from(op.entityType + 's')
        .select('*')
        .eq('id', op.entityId)
        .single();

      if (shouldApplyUpdate(existing, op)) {
        return await supabase
          .from(op.entityType + 's')
          .update(op.payload)
          .eq('id', op.entityId)
          .select()
          .single();
      } else {
        throw new Error('Conflict: Server version is newer');
      }

    case 'delete':
      return await supabase
        .from(op.entityType + 's')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', op.entityId)
        .select()
        .single();
  }
}

function shouldApplyUpdate(serverData, clientOp) {
  // Compare vector clocks or timestamps
  const serverTime = new Date(serverData.updated_at).getTime();
  const clientTime = new Date(clientOp.timestamp).getTime();

  return clientTime >= serverTime;
}
```

---

### 4. Vector Clocks for Conflict Resolution (Optional but Recommended)

Add vector clock to track causality:

```typescript
// db/schema.ts - Add to pins and forms tables
vectorClock: text('vector_clock'), // JSON: { deviceId: version }

// Example:
// Device A: { "deviceA": 1, "deviceB": 0 }
// Device B: { "deviceA": 1, "deviceB": 1 }
// Server can merge: { "deviceA": 1, "deviceB": 1 }
```

**Benefits**:

- ✅ Detects concurrent modifications
- ✅ Better than timestamps (no clock drift issues)
- ✅ Enables causal consistency
- ✅ Server can merge non-conflicting changes

---

### 5. Enhanced Conflict Resolution Strategy

```typescript
// services/sync/logic/syncing/EnhancedSyncStrategy.ts

export class EnhancedSyncStrategy extends SyncStrategy {
  /**
   * Resolve with vector clocks instead of timestamps
   */
  resolveWithVectorClock(
    local: LocalType,
    remote: RemoteType
  ): 'take_local' | 'take_remote' | 'conflict' {
    const localClock = JSON.parse(local.vectorClock || '{}');
    const remoteClock = JSON.parse(remote.vectorClock || '{}');

    const localNewer = this.isNewer(localClock, remoteClock);
    const remoteNewer = this.isNewer(remoteClock, localClock);

    if (localNewer && !remoteNewer) {
      return 'take_local';
    } else if (remoteNewer && !localNewer) {
      return 'take_remote';
    } else {
      // Concurrent modification - conflict!
      return 'conflict';
    }
  }

  /**
   * Check if clock1 is newer than clock2
   */
  private isNewer(clock1: VectorClock, clock2: VectorClock): boolean {
    for (const deviceId in clock1) {
      if (clock1[deviceId] > (clock2[deviceId] || 0)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Merge vector clocks (taking maximum for each device)
   */
  mergeVectorClocks(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged = { ...clock1 };

    for (const deviceId in clock2) {
      merged[deviceId] = Math.max(merged[deviceId] || 0, clock2[deviceId]);
    }

    return merged;
  }
}
```

---

### 6. Transaction Support with Rollback

```typescript
// services/sync/transaction/SyncTransaction.ts

export class SyncTransaction {
  private operations: SyncOperation[] = [];
  private committed = false;

  async begin(): Promise<void> {
    await db.run('BEGIN TRANSACTION');
  }

  async addOperation(op: SyncOperation): Promise<void> {
    this.operations.push(op);
    // Apply locally
    await this.applyLocally(op);
  }

  async commit(): Promise<void> {
    try {
      // Send all operations to server
      const results = await this.sendBatchToServer(this.operations);

      // Check for failures
      const failures = results.filter((r) => r.status === 'error');

      if (failures.length > 0) {
        throw new Error(`${failures.length} operations failed`);
      }

      // Commit local transaction
      await db.run('COMMIT');
      this.committed = true;
    } catch (error) {
      // Rollback on failure
      await this.rollback();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    await db.run('ROLLBACK');
    this.committed = false;
  }
}
```

---

## Implementation Phases

### Phase 1: Local Queue (Week 1-2)

- ✅ Create `syncQueue` table
- ✅ Implement `SyncQueueManager`
- ✅ Add `enqueue()` to UI operations
- ✅ Basic queue processing
- ✅ Retry logic with exponential backoff

### Phase 2: Idempotency (Week 2-3)

- ✅ Generate idempotency keys
- ✅ Backend endpoint for batch operations
- ✅ Idempotency key storage in backend
- ✅ Deduplication logic

### Phase 3: Enhanced Conflict Resolution (Week 3-4)

- ✅ Add vector clocks to schema
- ✅ Implement vector clock logic
- ✅ Update SyncStrategy
- ✅ Handle conflict scenarios

### Phase 4: Transaction Support (Week 4-5)

- ✅ Implement `SyncTransaction`
- ✅ Rollback mechanism
- ✅ Atomic batch operations

### Phase 5: Testing & Monitoring (Week 5-6)

- ✅ Edge case testing
- ✅ Multi-device testing
- ✅ Performance optimization
- ✅ Add metrics and monitoring

---

## Decision Matrix: Local Queue vs Backend-Only

| Feature                 | Local Queue          | Backend-Only               | Hybrid (Recommended) |
| ----------------------- | -------------------- | -------------------------- | -------------------- |
| **Offline Support**     | ✅ Excellent         | ❌ None                    | ✅ Excellent         |
| **Consistency**         | ⚠️ Eventual          | ✅ Immediate               | ✅ Strong Eventual   |
| **Idempotency**         | ⚠️ Client-side only  | ✅ Guaranteed              | ✅ Guaranteed        |
| **Conflict Resolution** | ⚠️ Limited           | ✅ Comprehensive           | ✅ Comprehensive     |
| **Complexity**          | 🟡 Medium            | 🟢 Low                     | 🔴 High              |
| **Reliability**         | ⚠️ Depends on client | ✅ Server guarantees       | ✅ Best of both      |
| **Performance**         | ✅ Fast              | ⚠️ Network dependent       | ✅ Fast + Reliable   |
| **Cost**                | 🟢 Low               | 🟡 Higher (more API calls) | 🟡 Medium            |

---

## Alternative Approaches Considered

### ❌ Option A: Backend-Only Sync (Rejected)

**Why not**: Breaks offline-first paradigm. Users can't work without network.

### ❌ Option B: CRDT (Conflict-Free Replicated Data Types)

**Why not**: Overkill for your use case. Complex to implement. Better for real-time collaboration.

### ❌ Option C: Event Sourcing

**Why not**: Too complex. Requires complete architecture redesign. Good for audit trails but heavyweight.

### ✅ Option D: Hybrid Queue + Backend (Recommended)

**Why yes**:

- Maintains offline-first UX
- Adds robustness and idempotency
- Incremental improvement to existing architecture
- Industry-standard pattern (used by Notion, Linear, etc.)

---

## Code Examples

### Example 1: Enqueue Operation

```typescript
// UI layer - when user creates a pin
async function createPin(pinData: Pin) {
  // 1. Save locally immediately (optimistic update)
  const pin = await localPinRepo.insert(pinData);

  // 2. Enqueue sync operation
  await syncQueueManager.enqueue({
    type: 'create',
    entityType: 'pin',
    entityId: pin.id,
    data: pin,
    timestamp: new Date().toISOString(),
  });

  // 3. UI updates immediately - user sees their change
  return pin;
}
```

### Example 2: Process Queue

```typescript
// Background sync (triggered periodically or on network change)
async function backgroundSync() {
  const queueManager = SyncQueueManager.getInstance();

  try {
    await queueManager.processQueue();
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    // Queue will retry automatically
  }
}

// Listen for network changes
NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    backgroundSync();
  }
});
```

### Example 3: Idempotency Key Generation

```typescript
function generateIdempotencyKey(op: QueueOperation): string {
  // Include operation details to ensure uniqueness
  const parts = [
    op.type,
    op.entityType,
    op.entityId,
    op.timestamp,
    getDeviceId(), // Unique device identifier
  ];

  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}
```

---

## Monitoring & Observability

Add metrics to track sync health:

```typescript
export interface SyncMetrics {
  queueLength: number;
  pendingOperations: number;
  failedOperations: number;
  avgSyncLatency: number;
  conflictsDetected: number;
  lastSuccessfulSync: Date | null;
}

export class SyncMonitor {
  async getMetrics(): Promise<SyncMetrics> {
    const pending = await db.select().from(syncQueue).where(eq(syncQueue.status, 'pending')).all();

    const failed = await db.select().from(syncQueue).where(eq(syncQueue.status, 'failed')).all();

    return {
      queueLength: pending.length + failed.length,
      pendingOperations: pending.length,
      failedOperations: failed.length,
      avgSyncLatency: await this.calculateAvgLatency(),
      conflictsDetected: await this.countConflicts(),
      lastSuccessfulSync: await this.getLastSuccessfulSync(),
    };
  }
}
```

---

## Testing Strategy

### Unit Tests

- ✅ Queue manager operations
- ✅ Idempotency key generation
- ✅ Vector clock comparison
- ✅ Conflict resolution logic

### Integration Tests

- ✅ End-to-end sync flow
- ✅ Retry mechanism
- ✅ Transaction rollback
- ✅ Multi-device scenarios

### Chaos Tests

- ✅ Network failures during sync
- ✅ App crashes mid-operation
- ✅ Concurrent modifications
- ✅ Clock drift scenarios

---

## Migration Plan

### Step 1: Add Queue Table (No Breaking Changes)

```bash
npm run drizzle-kit generate
npm run drizzle-kit migrate
```

### Step 2: Parallel Run (Both Systems)

- Keep existing sync working
- Add queue system alongside
- Monitor both systems

### Step 3: Gradual Migration

- Migrate one entity type at a time (Pins → Forms)
- Monitor queue metrics
- Fix any issues before full rollout

### Step 4: Deprecate Old System

- Once queue system stable
- Remove old direct sync code
- Keep migration flag for rollback

---

## Estimated Complexity

| Component           | Complexity | Dev Time     | Risk   |
| ------------------- | ---------- | ------------ | ------ |
| Queue Table         | 🟢 Low     | 2 days       | Low    |
| Queue Manager       | 🟡 Medium  | 5 days       | Medium |
| Backend Endpoint    | 🟡 Medium  | 4 days       | Medium |
| Vector Clocks       | 🔴 High    | 7 days       | High   |
| Transaction Support | 🔴 High    | 6 days       | Medium |
| Testing             | 🟡 Medium  | 5 days       | Low    |
| **Total**           |            | **~30 days** |        |

---

## Conclusion

**Recommendation: Implement Hybrid Local Queue + Backend Orchestration**

### Why This Approach?

1. ✅ **Maintains offline-first UX** - Users never blocked
2. ✅ **Adds robustness** - Queue survives crashes
3. ✅ **Enables idempotency** - No duplicate operations
4. ✅ **Improves consistency** - Vector clocks detect conflicts
5. ✅ **Incremental adoption** - Can migrate gradually
6. ✅ **Industry proven** - Used by Notion, Linear, Figma

### Quick Wins (If Limited Time)

If you only have time for quick improvements:

1. **Add idempotency keys** to current sync (2 days)
2. **Add retry logic** with exponential backoff (2 days)
3. **Store operation failures** for manual resolution (1 day)

These alone will significantly improve reliability without full queue system.

### Next Steps

1. Review this document with team
2. Choose implementation approach (full vs quick wins)
3. Create detailed tickets for Phase 1
4. Set up monitoring before changes
5. Start with read-only queue (observation mode)
6. Gradually roll out write operations

---

**Questions? Let's discuss the tradeoffs and implementation timeline!**
