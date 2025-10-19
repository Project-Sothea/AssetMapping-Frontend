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
import { syncPin, syncForm } from './syncOperations';

// ==================== Types ====================

type Operation = 'create' | 'update' | 'delete';
type EntityType = 'pin' | 'form';

interface QueueMetrics {
  pending: number;
  failed: number;
  completed: number;
}

// ==================== Private State ====================

let isProcessing = false;
let processingTimer: ReturnType<typeof setTimeout> | null = null;

// ==================== Public API ====================

/**
 * Queue a pin operation
 */
export async function enqueuePin(operation: Operation, data: any): Promise<string> {
  const id = data.id || uuidv4();
  return enqueue({
    operation,
    entityType: 'pin',
    entityId: id,
    payload: { ...data, id },
  });
}

/**
 * Queue a form operation
 */
export async function enqueueForm(operation: Operation, data: any): Promise<string> {
  const id = data.id || uuidv4();
  return enqueue({
    operation,
    entityType: 'form',
    entityId: id,
    payload: { ...data, id },
  });
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
  if (isProcessing) return;
  isProcessing = true;

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
    isProcessing = false;
    scheduleNextProcess();
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
  scheduleNextProcess();
}

/**
 * Clear all completed operations
 */
export async function cleanupOld(): Promise<void> {
  await db.delete(syncQueue).where(eq(syncQueue.status, 'completed'));
}

// ==================== Private Implementation ====================

async function enqueue(params: {
  operation: Operation;
  entityType: EntityType;
  entityId: string;
  payload: any;
}): Promise<string> {
  const operationId = uuidv4();
  const timestamp = new Date().toISOString();

  await db.insert(syncQueue).values({
    id: operationId,
    operation: params.operation,
    entityType: params.entityType,
    entityId: params.entityId,
    idempotencyKey: `${params.entityType}-${params.entityId}-${timestamp}`,
    payload: JSON.stringify(params.payload),
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    sequenceNumber: Date.now(),
    deviceId: 'mobile-app',
    createdAt: timestamp,
  });

  console.log(`📝 Queued ${params.operation} ${params.entityType} ${params.entityId.slice(0, 8)}`);
  scheduleNextProcess();
  return operationId;
}

async function processOperation(op: any): Promise<void> {
  const payload = JSON.parse(op.payload);
  if (op.entityType === 'pin') await syncPin(op.operation, payload);
  else await syncForm(op.operation, payload);
}

async function markCompleted(operationId: string): Promise<void> {
  await db
    .update(syncQueue)
    .set({ status: 'completed', lastAttemptAt: new Date().toISOString() })
    .where(eq(syncQueue.id, operationId));
}

async function handleError(op: any, error: Error): Promise<void> {
  const attempts = op.attempts + 1;
  const isRetriable = error.message.includes('network') || error.message.includes('timeout');
  const update = { attempts, lastError: error.message, lastAttemptAt: new Date().toISOString() };

  await db
    .update(syncQueue)
    .set(isRetriable && attempts < op.maxAttempts ? update : { ...update, status: 'failed' })
    .where(eq(syncQueue.id, op.id));
}

function scheduleNextProcess(): void {
  if (processingTimer) clearTimeout(processingTimer);
  processingTimer = setTimeout(() => processQueue(), 2000);
}
