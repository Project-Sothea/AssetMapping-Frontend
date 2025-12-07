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
import { eq, asc } from 'drizzle-orm';

import { syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

import { enqueue, processOperation, markCompleted, handleError } from './queueOperations';
import { getIsProcessing, setIsProcessing, scheduleNextProcess } from './queueState';
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
  const items = db.select().from(syncQueue).all();
  return {
    pending: items.filter((i) => i.status === 'pending').length,
    failed: items.filter((i) => i.status === 'failed').length,
    completed: items.filter((i) => i.status === 'completed').length,
  };
}

/**
 * Process pending queue operations
 */
export async function processQueue(): Promise<void> {
  if (getIsProcessing()) return;
  setIsProcessing(true);

  try {
    const pending = db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'pending'))
      .orderBy(asc(syncQueue.sequenceNumber))
      .limit(10)
      .all();

    if (!pending.length) return;

    for (const op of pending) {
      try {
        await processOperation(op);
        await markCompleted(op.id);
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        await handleError(op, errorObj);
        console.error(`❌ ${op.operation} ${op.entityType}: ${errorObj.message}`);
      }
    }
  } finally {
    setIsProcessing(false);
    scheduleNextProcess(processQueue);
  }
}

/**
 * Retry all failed operations
 */
export async function retryFailed(): Promise<void> {
  await db
    .update(syncQueue)
    .set({ status: 'pending', attempts: 0, lastError: null })
    .where(eq(syncQueue.status, 'failed'));
  scheduleNextProcess(processQueue);
}
