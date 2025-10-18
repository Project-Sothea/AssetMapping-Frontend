/**
 * Tests for SyncQueueManager
 *
 * Tests:
 * - Enqueue operations
 * - Process queue
 * - Retry logic
 * - Event system
 * - Metrics
 * - Idempotency
 * - Error handling
 */

import { SyncQueueManager } from '../SyncQueueManager';
import { db } from '~/services/drizzleDb';
import { syncQueue } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { QueueEvent } from '../types';
import { getCurrentTimestamp } from '../utils';

describe('SyncQueueManager', () => {
  let queueManager: SyncQueueManager;
  let events: QueueEvent[] = [];

  beforeEach(async () => {
    // Clear queue table
    await db.delete(syncQueue).execute();

    // Get fresh instance
    queueManager = SyncQueueManager.getInstance({
      maxAttempts: 3,
      batchSize: 5,
      baseBackoffMs: 1000,
      retentionDays: 7,
    });

    // Subscribe to events
    events = [];
    queueManager.subscribe((event) => {
      events.push(event);
    });
  });

  describe('Enqueue Operations', () => {
    test('enqueues operation successfully', async () => {
      const operationId = await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: { name: 'Test Pin', lat: 1.23, lng: 4.56 },
        timestamp: getCurrentTimestamp(),
      });

      expect(operationId).toBeTruthy();
      expect(operationId).toHaveLength(36); // UUID

      // Check database
      const ops = await db.select().from(syncQueue).where(eq(syncQueue.id, operationId)).all();
      expect(ops).toHaveLength(1);
      expect(ops[0].operation).toBe('create');
      expect(ops[0].entityType).toBe('pin');
      expect(ops[0].status).toBe('pending');

      // Check event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('operation_enqueued');
    });

    test('prevents duplicate operations (idempotency)', async () => {
      const input = {
        operation: 'create' as const,
        entityType: 'pin' as const,
        entityId: 'pin-123',
        data: { name: 'Test Pin' },
        timestamp: '2025-01-01T00:00:00.000Z',
      };

      const id1 = await queueManager.enqueue(input);
      const id2 = await queueManager.enqueue(input); // Same input

      expect(id1).toBe(id2); // Should return same ID

      // Check only one record exists
      const ops = await db.select().from(syncQueue).all();
      expect(ops).toHaveLength(1);
    });

    test('validates input before enqueuing', async () => {
      await expect(
        queueManager.enqueue({
          operation: 'invalid' as any,
          entityType: 'pin',
          entityId: 'pin-123',
          data: {},
          timestamp: getCurrentTimestamp(),
        })
      ).rejects.toThrow('Invalid operation input');
    });
  });

  describe('Process Queue', () => {
    test('processes pending operations', async () => {
      // Enqueue operations
      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-1',
        data: { name: 'Pin 1' },
        timestamp: getCurrentTimestamp(),
      });

      await queueManager.enqueue({
        operation: 'create',
        entityType: 'form',
        entityId: 'form-1',
        data: { title: 'Form 1' },
        timestamp: getCurrentTimestamp(),
      });

      // Process queue
      const result = await queueManager.processQueue();

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Check operations are completed
      const ops = await db.select().from(syncQueue).all();
      expect(ops.every((op) => op.status === 'completed')).toBe(true);
    });

    test('returns early if queue is empty', async () => {
      const result = await queueManager.processQueue();

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);

      // Check for queue_empty event
      const emptyEvent = events.find((e) => e.type === 'queue_empty');
      expect(emptyEvent).toBeDefined();
    });

    test('prevents concurrent processing', async () => {
      // Enqueue multiple operations
      for (let i = 0; i < 5; i++) {
        await queueManager.enqueue({
          operation: 'create',
          entityType: 'pin',
          entityId: `pin-${i}`,
          data: { name: `Pin ${i}` },
          timestamp: getCurrentTimestamp(),
        });
      }

      // Try to process concurrently
      const [result1, result2] = await Promise.all([
        queueManager.processQueue(),
        queueManager.processQueue(),
      ]);

      // One should process, other should return early
      const totalProcessed = result1.total + result2.total;
      expect(totalProcessed).toBeLessThanOrEqual(5);
    });

    test('respects batch size', async () => {
      // Enqueue 10 operations
      for (let i = 0; i < 10; i++) {
        await queueManager.enqueue({
          operation: 'create',
          entityType: 'pin',
          entityId: `pin-${i}`,
          data: { name: `Pin ${i}` },
          timestamp: getCurrentTimestamp(),
        });
      }

      // Process with batch size of 5
      const result = await queueManager.processQueue();

      expect(result.total).toBeLessThanOrEqual(5);
    });
  });

  describe('Retry Logic', () => {
    test('retries failed operations', async () => {
      // Enqueue operation
      const id = await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: { name: 'Test Pin' },
        timestamp: getCurrentTimestamp(),
      });

      // Manually mark as failed
      await db
        .update(syncQueue)
        .set({
          status: 'pending',
          attempts: 1,
          lastError: 'Network error',
        })
        .where(eq(syncQueue.id, id));

      // Process again
      await queueManager.processQueue();

      // Check attempts increased
      const ops = await db.select().from(syncQueue).where(eq(syncQueue.id, id)).all();
      expect(ops[0].attempts).toBeGreaterThan(1);
    });

    test('marks operation as failed after max retries', async () => {
      // Enqueue operation
      const id = await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: { name: 'Test Pin' },
        timestamp: getCurrentTimestamp(),
      });

      // Manually mark as failed with max attempts
      await db
        .update(syncQueue)
        .set({
          status: 'pending',
          attempts: 2, // Max attempts reached
          lastError: 'Network error',
        })
        .where(eq(syncQueue.id, id));

      // Process again - should mark as failed
      await queueManager.processQueue();

      // Check marked as failed
      const ops = await db.select().from(syncQueue).where(eq(syncQueue.id, id)).all();
      expect(ops[0].status).toBe('failed');

      // Check for max_retries event
      const maxRetriesEvent = events.find((e) => e.type === 'operation_max_retries');
      expect(maxRetriesEvent).toBeDefined();
    });
  });

  describe('Metrics', () => {
    test('returns correct metrics', async () => {
      // Enqueue different statuses
      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-1',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-2',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      // Process one
      await queueManager.processQueue();

      const metrics = await queueManager.getMetrics();

      expect(metrics.totalOperations).toBeGreaterThan(0);
      expect(metrics.pendingOperations).toBeDefined();
      expect(metrics.completedOperations).toBeDefined();
      expect(metrics.failedOperations).toBeDefined();
    });
  });

  describe('Event System', () => {
    test('emits operation_enqueued event', async () => {
      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      const enqueuedEvent = events.find((e) => e.type === 'operation_enqueued');
      expect(enqueuedEvent).toBeDefined();
      expect(enqueuedEvent?.operationId).toBeTruthy();
    });

    test('emits batch_started and batch_completed events', async () => {
      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      await queueManager.processQueue();

      const batchStartedEvent = events.find((e) => e.type === 'batch_started');
      const batchCompletedEvent = events.find((e) => e.type === 'batch_completed');

      expect(batchStartedEvent).toBeDefined();
      expect(batchCompletedEvent).toBeDefined();
    });

    test('unsubscribe removes listener', async () => {
      const localEvents: QueueEvent[] = [];
      const unsubscribe = queueManager.subscribe((event) => {
        localEvents.push(event);
      });

      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      expect(localEvents).toHaveLength(1);

      unsubscribe();

      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-456',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      // Should still be 1 (not receiving new events)
      expect(localEvents).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles invalid JSON in payload', async () => {
      const id = await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: { name: 'Test' },
        timestamp: getCurrentTimestamp(),
      });

      // Manually corrupt payload
      await db.update(syncQueue).set({ payload: 'invalid json' }).where(eq(syncQueue.id, id));

      // Should handle gracefully
      const result = await queueManager.processQueue();
      expect(result.failed).toBeGreaterThan(0);
    });

    test('handles null deviceId', async () => {
      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: {},
        timestamp: getCurrentTimestamp(),
        deviceId: undefined,
      });

      const ops = await db.select().from(syncQueue).all();
      expect(ops[0].deviceId).toBeTruthy(); // Should generate device ID
    });
  });

  describe('Cleanup', () => {
    test('cleanupOld removes old completed operations', async () => {
      // Enqueue and complete operation
      await queueManager.enqueue({
        operation: 'create',
        entityType: 'pin',
        entityId: 'pin-123',
        data: {},
        timestamp: getCurrentTimestamp(),
      });

      await queueManager.processQueue();

      // Manually set old timestamp (8 days ago)
      const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await db
        .update(syncQueue)
        .set({ createdAt: oldTimestamp })
        .where(eq(syncQueue.status, 'completed'));

      // Cleanup (default retention: 7 days)
      const deleted = await queueManager.cleanupOld();

      expect(deleted).toBe(1);

      const ops = await db.select().from(syncQueue).all();
      expect(ops).toHaveLength(0);
    });
  });
});
