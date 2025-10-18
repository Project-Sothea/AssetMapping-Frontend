/**
 * Quick Start Guide - Sync Queue Usage
 *
 * This file shows practical examples of using the queue system.
 * Copy and adapt these examples to your needs.
 */

import {
  SyncQueueManager,
  enqueuePinCreate,
  enqueuePinUpdate,
  enqueuePinDelete,
  processQueueNow,
  getQueueHealth,
  subscribeToQueueEvents,
} from '~/services/sync/queue';
import { v4 as uuidv4 } from 'uuid';

// ==================== Example 1: Basic Usage ====================

export async function example1_BasicPinCreation() {
  console.log('\n📝 Example 1: Create a pin and sync\n');

  // Step 1: Enqueue pin creation
  const pinId = uuidv4();
  const operationId = await enqueuePinCreate({
    id: pinId,
    name: 'Test Pin',
    lat: 1.23,
    lng: 4.56,
    type: 'residential',
    city_village: 'Test City',
    address: '123 Test St',
    description: 'Test description',
    status: 'dirty',
    localImages: '[]',
    images: null,
  });

  console.log(`✓ Operation queued: ${operationId}`);

  // Step 2: Process queue
  await processQueueNow();
  console.log(`✓ Queue processed\n`);
}

// ==================== Example 2: Event Monitoring ====================

export function example2_MonitorQueueEvents() {
  console.log('\n📡 Example 2: Monitor queue events\n');

  // Subscribe to all events
  const unsubscribe = subscribeToQueueEvents((event) => {
    switch (event.type) {
      case 'operation_enqueued':
        console.log(`📥 Enqueued: ${event.operationId}`);
        break;

      case 'operation_started':
        console.log(`🔄 Processing: ${event.operationId}`);
        break;

      case 'operation_completed':
        console.log(`✅ Completed: ${event.operationId}`);
        break;

      case 'operation_failed':
        console.error(`❌ Failed: ${event.operationId}`, event.error?.message);
        break;

      case 'operation_max_retries':
        console.warn(`⚠️  Max retries: ${event.operationId}`);
        break;

      case 'batch_completed':
        const { successful, total } = event.result!;
        console.log(`📦 Batch complete: ${successful}/${total} successful`);
        break;

      case 'queue_empty':
        console.log(`✨ Queue is empty`);
        break;
    }
  });

  // Later: unsubscribe when done
  // unsubscribe();

  console.log('✓ Event listener registered\n');
  return unsubscribe;
}

// ==================== Example 3: Batch Operations ====================

export async function example3_BatchOperations() {
  console.log('\n📦 Example 3: Batch multiple operations\n');

  // Enqueue multiple operations
  const ops = [];

  // Create 5 pins
  for (let i = 0; i < 5; i++) {
    const opId = await enqueuePinCreate({
      id: uuidv4(),
      name: `Batch Pin ${i + 1}`,
      lat: 1.0 + i * 0.1,
      lng: 2.0 + i * 0.1,
      type: 'residential',
      city_village: 'Batch City',
      address: `${i + 1} Batch St`,
      status: 'dirty',
      localImages: '[]',
      images: null,
    });
    ops.push(opId);
  }

  console.log(`✓ Enqueued ${ops.length} operations`);

  // Process all
  await processQueueNow();
  console.log(`✓ Queue processed\n`);
}

// ==================== Example 4: Error Handling ====================

export async function example4_ErrorHandling() {
  console.log('\n⚠️  Example 4: Handle errors with retry\n');

  // Subscribe to events to see retry behavior
  const unsubscribe = subscribeToQueueEvents((event) => {
    if (event.type === 'operation_failed') {
      console.log(`  Retry attempt ${event.attempts} for ${event.operationId}`);
    }
    if (event.type === 'operation_max_retries') {
      console.log(`  Max retries reached for ${event.operationId}`);
    }
  });

  // Enqueue operation (will fail with 10% chance in simulation)
  await enqueuePinCreate({
    id: uuidv4(),
    name: 'Error Test Pin',
    lat: 1.0,
    lng: 2.0,
    type: 'residential',
    status: 'dirty',
    localImages: '[]',
    images: null,
  });

  // Process - may fail and retry automatically
  await processQueueNow();

  unsubscribe();
  console.log('');
}

// ==================== Example 5: Queue Health Monitoring ====================

export async function example5_HealthMonitoring() {
  console.log('\n💚 Example 5: Check queue health\n');

  const health = await getQueueHealth();

  console.log('Queue Metrics:');
  console.log(`  Total operations: ${health.totalOperations}`);
  console.log(`  Pending: ${health.pendingOperations}`);
  console.log(`  In progress: ${health.inProgressOperations}`);
  console.log(`  Failed: ${health.failedOperations}`);
  console.log(`  Completed: ${health.completedOperations}`);
  console.log(`  Avg latency: ${health.avgLatencyMs}ms`);

  if (health.oldestPendingAt) {
    const age = Date.now() - new Date(health.oldestPendingAt).getTime();
    console.log(`  Oldest pending: ${Math.round(age / 1000)}s ago`);
  }

  if (health.lastSuccessfulSyncAt) {
    const age = Date.now() - new Date(health.lastSuccessfulSyncAt).getTime();
    console.log(`  Last sync: ${Math.round(age / 1000)}s ago`);
  }

  console.log('');
}

// ==================== Example 6: Update and Delete ====================

export async function example6_UpdateAndDelete() {
  console.log('\n✏️  Example 6: Update and delete operations\n');

  // Create a pin first
  const pinId = uuidv4();
  await enqueuePinCreate({
    id: pinId,
    name: 'Original Name',
    lat: 1.0,
    lng: 2.0,
    type: 'residential',
    status: 'dirty',
    localImages: '[]',
    images: null,
  });

  console.log('✓ Created pin');

  // Update it
  await enqueuePinUpdate(pinId, {
    name: 'Updated Name',
    description: 'New description',
  });

  console.log('✓ Queued update');

  // Delete it
  await enqueuePinDelete(pinId);

  console.log('✓ Queued deletion');

  // Process all operations
  await processQueueNow();
  console.log(`✓ Queue processed\n`);
}

// ==================== Example 7: Direct Manager Usage ====================

export async function example7_DirectManagerAccess() {
  console.log('\n🔧 Example 7: Direct manager access (advanced)\n');

  const queueManager = SyncQueueManager.getInstance();

  // Can also get with custom configuration if needed
  // const customManager = SyncQueueManager.getInstance({
  //   maxAttempts: 5,
  //   baseBackoffMs: 2000,
  //   batchSize: 20,
  //   retentionDays: 14,
  // });

  console.log('✓ Got queue manager');

  // Subscribe to events
  const unsubscribe = queueManager.subscribe((event) => {
    console.log(`Event: ${event.type}`);
  });

  // Enqueue with full control
  const operationId = await queueManager.enqueue({
    operation: 'create',
    entityType: 'pin',
    entityId: uuidv4(),
    data: {
      name: 'Advanced Pin',
      lat: 1.0,
      lng: 2.0,
    },
    timestamp: new Date().toISOString(),
    dependsOn: [], // Can specify dependencies
  });

  console.log(`✓ Enqueued: ${operationId}`);

  // Process queue
  await queueManager.processQueue();

  // Get metrics
  const metrics = await queueManager.getMetrics();
  console.log(`✓ Metrics: ${metrics.totalOperations} total operations`);

  // Cleanup
  const cleaned = await queueManager.cleanupOld();
  console.log(`✓ Cleaned up ${cleaned} old operations`);

  unsubscribe();
  console.log('');
}

// ==================== Example 8: Idempotency Test ====================

export async function example8_IdempotencyTest() {
  console.log('\n🔐 Example 8: Test idempotency\n');

  const pinId = uuidv4();
  const timestamp = new Date().toISOString();

  const pinData = {
    id: pinId,
    name: 'Idempotent Pin',
    lat: 1.0,
    lng: 2.0,
    type: 'residential' as const,
    status: 'dirty' as const,
    localImages: '[]',
    images: null,
  };

  // Enqueue same operation multiple times
  console.log('Attempting to enqueue same operation 3 times...');

  const queueManager = SyncQueueManager.getInstance();

  const opId1 = await queueManager.enqueue({
    operation: 'create',
    entityType: 'pin',
    entityId: pinId,
    data: pinData,
    timestamp,
  });

  const opId2 = await queueManager.enqueue({
    operation: 'create',
    entityType: 'pin',
    entityId: pinId,
    data: pinData,
    timestamp, // Same timestamp = same idempotency key
  });

  const opId3 = await queueManager.enqueue({
    operation: 'create',
    entityType: 'pin',
    entityId: pinId,
    data: pinData,
    timestamp, // Same timestamp = same idempotency key
  });

  console.log(`Operation IDs: ${opId1}, ${opId2}, ${opId3}`);
  console.log(`✓ All 3 attempts returned same operation ID (idempotency working!)\n`);

  if (opId1 === opId2 && opId2 === opId3) {
    console.log('✅ PASSED: Idempotency check successful\n');
  } else {
    console.log('❌ FAILED: Idempotency check failed\n');
  }
}

// ==================== Run All Examples ====================

export async function runAllExamples() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SYNC QUEUE EXAMPLES');
  console.log('='.repeat(60));

  try {
    await example1_BasicPinCreation();
    example2_MonitorQueueEvents(); // Just sets up listener
    await example3_BatchOperations();
    await example4_ErrorHandling();
    await example5_HealthMonitoring();
    await example6_UpdateAndDelete();
    await example7_DirectManagerAccess();
    await example8_IdempotencyTest();

    console.log('='.repeat(60));
    console.log('✅ All examples completed!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// ==================== Quick Test Function ====================

/**
 * Quick test you can call from anywhere in the app
 */
export async function quickQueueTest() {
  console.log('\n🧪 Quick Queue Test\n');

  // 1. Create a pin
  const pinId = uuidv4();
  await enqueuePinCreate({
    id: pinId,
    name: 'Quick Test Pin',
    lat: 1.23,
    lng: 4.56,
    type: 'residential',
    status: 'dirty',
    localImages: '[]',
    images: null,
  });

  // 2. Process
  await processQueueNow();

  // 3. Check health
  const health = await getQueueHealth();
  console.log(
    `Queue: ${health.pendingOperations} pending, ${health.completedOperations} completed\n`
  );
}

// ==================== Usage Instructions ====================

/*

HOW TO USE:

1. Import in your app:
   ```ts
   import { quickQueueTest, runAllExamples } from '~/services/sync/queue/USAGE_EXAMPLES';
   ```

2. Test in app initialization:
   ```ts
   // In app/_layout.tsx after migrations:
   if (__DEV__) {
     quickQueueTest().catch(console.error);
   }
   ```

3. Or run in a button press:
   ```tsx
   <Button onPress={() => quickQueueTest()}>Test Queue</Button>
   ```

4. Monitor in console:
   - Check logs for operation progress
   - Look for ✓ success marks
   - Watch for retry attempts

5. Check database:
   - Open Drizzle Studio
   - Look at sync_queue table
   - See operation status, attempts, errors

*/
