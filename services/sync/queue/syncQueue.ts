/**
 * Simplified Sync Queue
 *
 * Public API:
 * - enqueuePin(operation, data) - Queue pin sync
 * - enqueueForm(operation, data) - Queue form sync
 * - processQueue() - Process pending operations
 * - getQueueMetrics() - Get queue health stats
 */

import { v4 as uuidv4 } from 'uuid';
import { eq, asc } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { syncQueue } from '~/db/schema';
import { Operation, QueueMetrics } from './types';
import { enqueue, processOperation, markCompleted, handleError } from './queueOperations';
import { getIsProcessing, setIsProcessing, scheduleNextProcess } from './queueUtils';

// ==================== Public API ====================

/**
 * Queue a pin operation
 */
export async function enqueuePin(operation: Operation, data: any): Promise<string> {
  const id = data.id || uuidv4();
  const operationId = await enqueue({
    operation,
    entityType: 'pin',
    entityId: id,
    payload: { ...data, id },
  });
  scheduleNextProcess(processQueue);
  return operationId;
}

/**
 * Queue a form operation
 */
export async function enqueueForm(operation: Operation, data: any): Promise<string> {
  const id = data.id || uuidv4();

  // Ensure dates are properly serialized
  const cleanData = {
    ...data,
    id,
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt,
  };

  const operationId = await enqueue({
    operation,
    entityType: 'form',
    entityId: id,
    payload: cleanData,
  });
  scheduleNextProcess(processQueue);
  return operationId;
}

/**
 * Get queue health metrics
 */
export async function getQueueMetrics(): Promise<QueueMetrics> {
  const items = await db.select().from(syncQueue).all();
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
    const pending = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'pending'))
      .orderBy(asc(syncQueue.sequenceNumber))
      .limit(10)
      .all();

    if (!pending.length) return;

    console.log(`🔄 Processing ${pending.length} queued operations`);

    for (const op of pending) {
      try {
        await processOperation(op);
        await markCompleted(op.id);
        console.log(`✅ ${op.operation} ${op.entityType} ${op.entityId.slice(0, 8)}`);
      } catch (error: any) {
        await handleError(op, error);
        console.error(`❌ ${op.operation} ${op.entityType}: ${error.message}`);
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

/**
 * Clear all completed operations
 */
export async function cleanupOld(): Promise<void> {
  await db.delete(syncQueue).where(eq(syncQueue.status, 'completed'));
}

/**
 * Clear all failed operations
 */
export async function clearFailed(): Promise<void> {
  await db.delete(syncQueue).where(eq(syncQueue.status, 'failed'));
}
