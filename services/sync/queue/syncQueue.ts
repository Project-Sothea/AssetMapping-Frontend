/**
 * Simplified Sync Queue
 *
 * Public API:
 * - enqueuePin(operation, data) - Queue pin sync
 * - enqueueForm(operation, data) - Queue form sync
 * - processQueue() - Process pending operations
 * - getQueueMetrics() - Get queue health stats
 */

import { Form, Pin } from '@assetmapping/shared-types';
import { eq, asc, count, inArray } from 'drizzle-orm';

import { syncQueue, syncInflight } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { createSingleFlight } from '~/shared/utils/singleFlight';

import {
  enqueue,
  processOperation,
  markCompleted,
  handleError,
  isCurrentOperation,
  stageOperation,
  pendingInflight,
  hasInflight,
} from './queueOperations';
import { scheduleNextProcess } from './queueState';
import { Operation, QueueMetrics } from './types';

// ==================== Public API ====================

/**
 * Queue a pin operation
 */
export async function enqueuePin(operation: Operation, data: Pin): Promise<string> {
  const operationId = await enqueue({
    operation,
    entityType: 'pin',
    entityId: data.id,
    payload: data,
  });
  scheduleNextProcess(processQueue);
  return operationId;
}

/**
 * Queue a form operation
 */
export async function enqueueForm(operation: Operation, data: Form): Promise<string> {
  const operationId = await enqueue({
    operation,
    entityType: 'form',
    entityId: data.id,
    payload: data,
  });
  scheduleNextProcess(processQueue);
  return operationId;
}

/**
 * Get queue health metrics
 */
export async function getQueueMetrics(): Promise<QueueMetrics> {
  const queue = db
    .select({ id: syncQueue.id, status: syncQueue.status })
    .from(syncQueue)
    .where(inArray(syncQueue.status, ['pending', 'failed']))
    .all();
  const inflight = db
    .select({ id: syncInflight.queueId, status: syncInflight.status })
    .from(syncInflight)
    .all();
  const failed = new Set(
    [...queue, ...inflight].filter((item) => item.status === 'failed').map((item) => item.id)
  );
  const pending = new Set(
    [...queue, ...inflight]
      .filter((item) => item.status === 'pending' && !failed.has(item.id))
      .map((item) => item.id)
  );
  const completed =
    db.select({ n: count() }).from(syncQueue).where(eq(syncQueue.status, 'completed')).get()?.n ??
    0;
  return { pending: pending.size, failed: failed.size, completed };
}

/**
 * Process pending queue operations
 */
const queueFlight = createSingleFlight();
export function processQueue(): Promise<void> {
  return queueFlight.run(processQueueBatch);
}

async function processQueueBatch(): Promise<void> {
  try {
    const run = async (op: Parameters<typeof processOperation>[0]) => {
      try {
        stageOperation(op);
        const syncedData = await processOperation(op);
        markCompleted(op, syncedData);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await handleError(op, err);
        console.warn('A sync operation remains saved for retry or review.');
      }
    };
    const replay = pendingInflight().slice(0, 10);
    for (const op of replay) await run(op);
    const pending = db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'pending'))
      .orderBy(asc(syncQueue.sequenceNumber))
      .limit(10)
      .all();
    for (const op of pending) {
      if (!isCurrentOperation(op) || hasInflight(op.entityType, op.entityId)) continue;
      await run(op);
    }
  } finally {
    const pending = db
      .select({ type: syncQueue.entityType, id: syncQueue.entityId })
      .from(syncQueue)
      .where(eq(syncQueue.status, 'pending'))
      .all();
    if (pendingInflight().length || pending.some((op) => !hasInflight(op.type, op.id)))
      scheduleNextProcess(processQueue);
  }
}

/**
 * Retry all failed operations
 */
export async function retryFailed(): Promise<void> {
  db.transaction((tx) => {
    tx.update(syncQueue)
      .set({ status: 'pending', attempts: 0, lastError: null })
      .where(eq(syncQueue.status, 'failed'))
      .run();
    for (const row of tx
      .select()
      .from(syncInflight)
      .where(eq(syncInflight.status, 'failed'))
      .all()) {
      const op = JSON.parse(row.operation);
      tx.update(syncInflight)
        .set({
          status: 'pending',
          operation: JSON.stringify({ ...op, attempts: 0, status: 'pending', lastError: null }),
        })
        .where(eq(syncInflight.key, row.key))
        .run();
    }
  });
  scheduleNextProcess(processQueue);
}
