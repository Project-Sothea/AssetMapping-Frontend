import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { syncQueue } from '~/db/schema';
import { syncPin, syncForm } from './syncOperations';
import { Operation, EntityType } from './types';
import { sanitizeForDb } from '~/db/utils';
import { safeJsonParse } from '~/shared/utils/parsing';

export async function enqueue(params: {
  operation: Operation;
  entityType: EntityType;
  entityId: string;
  payload: any;
}): Promise<string> {
  try {
    const operationId = uuidv4();
    const timestamp = new Date().toISOString();

    // Sanitize payload to ensure it's SQLite-safe
    const sanitizedPayload = sanitizeForDb(params.payload);
    const payloadString = JSON.stringify(sanitizedPayload);

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
  } catch (error: any) {
    console.error('❌ Enqueue DB error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      operation: params.operation,
      entityType: params.entityType,
    });
    throw error;
  }
}

export async function processOperation(op: any): Promise<void> {
  const payload = safeJsonParse(op.payload, {});
  if (op.entityType === 'pin') await syncPin(op.operation, payload);
  else await syncForm(op.operation, payload);
}

export async function markCompleted(operationId: string): Promise<void> {
  await db
    .update(syncQueue)
    .set({ status: 'completed', lastAttemptAt: new Date().toISOString() })
    .where(eq(syncQueue.id, operationId));
}

export async function handleError(op: any, error: Error): Promise<void> {
  const attempts = op.attempts + 1;
  const isRetriable = error.message.includes('network') || error.message.includes('timeout');
  const update = { attempts, lastError: error.message, lastAttemptAt: new Date().toISOString() };

  await db
    .update(syncQueue)
    .set(isRetriable && attempts < op.maxAttempts ? update : { ...update, status: 'failed' })
    .where(eq(syncQueue.id, op.id));
}
