# What "Import Helpers" Means

## TL;DR

**Helpers = Simple functions you can import and use directly in your UI components**

Instead of dealing with complex queue manager classes, just import and call simple functions like:

```typescript
import { enqueuePinCreate } from '~/services/sync/queue';
await enqueuePinCreate(pinData);
```

---

## The Problem They Solve

**Without helpers** (complex):

```typescript
import { SyncQueueManager } from '~/services/sync/queue';

const queueManager = SyncQueueManager.getInstance();
await queueManager.enqueue({
  operation: 'create',
  entityType: 'pin',
  entityId: pin.id,
  data: pinData,
  timestamp: new Date().toISOString(),
  deviceId: getDeviceId(),
});
```

**With helpers** (simple):

```typescript
import { enqueuePinCreate } from '~/services/sync/queue';
await enqueuePinCreate(pinData);
```

The helper wraps all the complex logic for you!

---

## Available Helpers

### Pin Operations

```typescript
import { enqueuePinCreate, enqueuePinUpdate, enqueuePinDelete } from '~/services/sync/queue';

// Create a pin
await enqueuePinCreate({
  id: uuidv4(),
  name: 'New Pin',
  lat: 1.23,
  lng: 4.56,
  // ... other pin fields
});

// Update a pin
await enqueuePinUpdate(pinId, {
  name: 'Updated Name',
  description: 'New description',
});

// Delete a pin
await enqueuePinDelete(pinId);
```

### Form Operations

```typescript
import { enqueueFormSubmit, enqueueFormUpdate, enqueueFormDelete } from '~/services/sync/queue';

// Submit a form
await enqueueFormSubmit({
  id: uuidv4(),
  pinId: 'pin-123',
  // ... form fields
});

// Update a form
await enqueueFormUpdate(formId, {
  /* changes */
});

// Delete a form
await enqueueFormDelete(formId);
```

### Queue Management

```typescript
import {
  processQueueNow,
  getQueueHealth,
  subscribeToQueueEvents,
  retryFailedOperations,
} from '~/services/sync/queue';

// Trigger sync
await processQueueNow();

// Check queue status
const health = await getQueueHealth();
console.log(`${health.pendingOperations} pending`);

// Monitor events
const unsubscribe = subscribeToQueueEvents((event) => {
  if (event.type === 'operation_completed') {
    console.log('Synced!');
  }
});

// Retry failed
await retryFailedOperations();
```

---

## Real Example: Update Your Map Component

### Current Code (features/pins/components/Map.tsx)

```typescript
const handlePinSubmit = async (values: any) => {
  const pinService = getPinService();
  const result = await pinService.createPin(values);

  if (result.success) {
    Alert.alert('Pin Created!');
  }
};
```

### Option 1: Add Queue Alongside (Recommended First)

```typescript
import { enqueuePinCreate } from '~/services/sync/queue';

const handlePinSubmit = async (values: any) => {
  const pinService = getPinService();
  const result = await pinService.createPin(values); // Local DB write

  if (result.success) {
    // Also queue for backend sync
    await enqueuePinCreate(values);

    Alert.alert('Pin Created!');
  }
};
```

### Option 2: Queue Only (Future)

```typescript
import { enqueuePinCreate } from '~/services/sync/queue';

const handlePinSubmit = async (values: any) => {
  try {
    // Queue handles everything
    await enqueuePinCreate(values);
    Alert.alert('Pin Created!');
  } catch (error) {
    Alert.alert('Failed to create pin');
  }
};
```

---

## Why Use Helpers?

✅ **Simple** - Just call a function, no need to understand queue internals  
✅ **Type-safe** - Full TypeScript support  
✅ **Less code** - One line instead of 10  
✅ **Maintainable** - If queue logic changes, helpers stay the same  
✅ **Consistent** - Same API everywhere in your app

---

## Where Are They Defined?

**File**: `services/sync/queue/helpers.ts`

Each helper is just a wrapper around the queue manager:

```typescript
// Inside helpers.ts
export async function enqueuePinCreate(pinData: Record<string, any>): Promise<string> {
  const queueManager = SyncQueueManager.getInstance();

  return await queueManager.enqueue({
    operation: 'create',
    entityType: 'pin',
    entityId: pinData.id || uuidv4(),
    data: pinData,
    timestamp: getCurrentTimestamp(),
  });
}
```

You just call `enqueuePinCreate(data)` and the helper does all the complex stuff!

---

## How to Use Them

### 1. Import What You Need

```typescript
import { enqueuePinCreate, processQueueNow } from '~/services/sync/queue';
```

### 2. Call the Helper

```typescript
await enqueuePinCreate(pinData);
```

### 3. That's It!

The helper handles:

- Creating the queue manager
- Formatting the operation
- Generating timestamps
- Adding to queue
- Everything else

---

## Example: Add Sync Button

```typescript
import { processQueueNow, getQueueHealth } from '~/services/sync/queue';
import { useState } from 'react';
import { Button, Text } from 'react-native';

function SyncButton() {
  const [pending, setPending] = useState(0);

  const handleSync = async () => {
    // Trigger sync
    await processQueueNow();

    // Check status
    const health = await getQueueHealth();
    setPending(health.pendingOperations);
  };

  return (
    <View>
      <Button onPress={handleSync}>Sync Now</Button>
      <Text>{pending} operations pending</Text>
    </View>
  );
}
```

---

## Summary

**"Import helpers" means:**

1. **Import** simple functions from the queue package
2. **Call** them like any normal function
3. **Profit** - they handle all the complexity

You don't need to understand how the queue works internally. Just import and use!

```typescript
// That's it - 3 lines to add queue support!
import { enqueuePinCreate } from '~/services/sync/queue';
const operationId = await enqueuePinCreate(pinData);
console.log(`Queued: ${operationId}`);
```

vs

```typescript
// Complex version - 15+ lines
import { SyncQueueManager, generateIdempotencyKey, getDeviceId } from '~/services/sync/queue';
const queueManager = SyncQueueManager.getInstance();
const deviceId = getDeviceId();
const timestamp = new Date().toISOString();
const idempotencyKey = generateIdempotencyKey({
  operation: 'create',
  entityType: 'pin',
  entityId: pinData.id,
  timestamp,
  deviceId,
});
const operationId = await queueManager.enqueue({
  operation: 'create',
  entityType: 'pin',
  entityId: pinData.id,
  data: pinData,
  timestamp,
  deviceId,
});
```

**Helpers = Convenience functions that make your life easier!** 🎉
