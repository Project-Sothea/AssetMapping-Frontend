import { eq, and, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { syncQueue } from '~/db/schema';
import { sanitizeForDb } from '~/db/utils';
import { db } from '~/services/drizzleDb';
import { safeJsonParse } from '~/shared/utils/parsing';

import { syncPin, syncForm } from './syncOperations';
import { Operation, EntityType } from './types';

/**
 * Sync a queued operation to remote by syncing the entity (pin or form) based on its type and operation.
 * @param op - The operation object from the queue.
 */
export async function processOperation(op: {
  entityType: string;
  operation: string;
  payload: string;
}): Promise<void> {
  const payload = safeJsonParse(op.payload, {});
  if (op.entityType === 'pin') await syncPin(op.operation as Operation, payload as any);
  else await syncForm(op.operation as Operation, payload as any);
}

/**
 * Enqueues a new operation into the sync queue for later processing.
 * If a pending/failed operation already exists for the same entity, updates it instead.
 * @param params - The operation details including type, entity, and payload.
 * @returns The unique operation ID.
 */
export async function enqueue(params: {
  operation: Operation;
  entityType: EntityType;
  entityId: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  try {
    const timestamp = new Date().toISOString();

    // Sanitize payload to ensure it's SQLite-safe
    const sanitizedPayload = sanitizeForDb(params.payload);
    const payloadString = JSON.stringify(sanitizedPayload);

    // Check if there's an existing pending/failed operation for this entity
    const existing = await db
      .select()
      .from(syncQueue)
      .where(
        and(
          eq(syncQueue.entityId, params.entityId),
          eq(syncQueue.entityType, params.entityType),
          or(eq(syncQueue.status, 'pending'), eq(syncQueue.status, 'failed'))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing operation with new payload and operation type
      const existingOp = existing[0];
      console.log('🔄 Updating existing queue entry:', {
        id: existingOp.id.slice(0, 8),
        oldOperation: existingOp.operation,
        newOperation: params.operation,
        entityId: params.entityId.slice(0, 8),
      });

      await db
        .update(syncQueue)
        .set({
          operation: params.operation,
          payload: payloadString,
          status: 'pending', // Reset to pending
          attempts: 0, // Reset attempts
          lastError: null, // Clear error
          sequenceNumber: Date.now(), // Update sequence for proper ordering
          idempotencyKey: `${params.entityType}-${params.entityId}-${timestamp}`,
        })
        .where(eq(syncQueue.id, existingOp.id));

      console.log(
        `✅ Updated queue entry ${params.operation} ${params.entityType} ${params.entityId.slice(0, 8)}`
      );
      return existingOp.id;
    }

    // No existing operation - create new one
    const operationId = uuidv4();

    console.log('🔍 Enqueueing:', {
      id: operationId.slice(0, 8),
      operation: params.operation,
      entityType: params.entityType,
      entityId: params.entityId.slice(0, 8),
      payloadSize: payloadString.length,
    });

    // Insert into queue
    await db.insert(syncQueue).values({
      id: operationId,
      operation: params.operation,
      entityType: params.entityType,
      entityId: params.entityId,
      idempotencyKey: `${params.entityType}-${params.entityId}-${timestamp}`,
      payload: payloadString,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      sequenceNumber: Date.now(),
      deviceId: 'mobile-app',
      createdAt: timestamp,
    });

    console.log(
      `✅ Queued ${params.operation} ${params.entityType} ${params.entityId.slice(0, 8)}`
    );
    return operationId;
  } catch (error) {
    console.error('❌ Enqueue DB error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        operation: params.operation,
        entityType: params.entityType,
      });
    }
    throw error;
  }
}

/**
 * Marks a queued operation as completed in the database.
 * @param operationId - The ID of the operation to mark as completed.
 */
export async function markCompleted(operationId: string): Promise<void> {
  await db
    .update(syncQueue)
    .set({ status: 'completed', lastAttemptAt: new Date().toISOString() })
    .where(eq(syncQueue.id, operationId));
}

/**
 * Handles errors for a failed operation, updating attempts and status accordingly.
 * @param op - The operation object that failed.
 * @param error - The error that occurred.
 */
export async function handleError(
  op: { id: string; attempts: number; maxAttempts: number },
  error: Error
): Promise<void> {
  const attempts = op.attempts + 1;
  const isRetriable = error.message.includes('network') || error.message.includes('timeout');
  const update = { attempts, lastError: error.message, lastAttemptAt: new Date().toISOString() };

  await db
    .update(syncQueue)
    .set(isRetriable && attempts < op.maxAttempts ? update : { ...update, status: 'failed' })
    .where(eq(syncQueue.id, op.id));
}
