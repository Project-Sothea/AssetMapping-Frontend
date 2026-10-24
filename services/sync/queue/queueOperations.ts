import { eq, and, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

import { mergeOperation } from './operationMerge';
import { syncPin, syncForm } from './syncOperations';
import type { Operation, EntityType } from './types';

export type LocalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type QueueRow = typeof syncQueue.$inferSelect;
export const outstanding = or(eq(syncQueue.status, 'pending'), eq(syncQueue.status, 'failed'));
export async function processOperation(op: QueueRow): Promise<void> {
  const payload = JSON.parse(op.payload);
  if (op.entityType === 'pin') await syncPin(op.operation as Operation, payload, op.idempotencyKey);
  else await syncForm(op.operation as Operation, payload, op.idempotencyKey);
}
export function enqueueInTransaction(
  tx: LocalTransaction,
  params: {
    operation: Operation;
    entityType: EntityType;
    entityId: string;
    payload: Record<string, unknown>;
  }
): string {
  const existing = tx
    .select()
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.entityId, params.entityId),
        eq(syncQueue.entityType, params.entityType),
        outstanding
      )
    )
    .get();
  const operation = existing
    ? mergeOperation(
        existing.operation as Operation,
        params.operation,
        !!existing.lastAttemptAt || existing.attempts > 0
      )
    : params.operation;
  if (!operation && existing) {
    tx.delete(syncQueue).where(eq(syncQueue.id, existing.id)).run();
    return existing.id;
  }
  const id = existing?.id ?? uuidv4();
  const values = {
    operation: operation!,
    payload: JSON.stringify(params.payload),
    status: 'pending',
    attempts: 0,
    lastError: null,
    sequenceNumber: Date.now(),
    idempotencyKey: uuidv4(),
  };
  if (existing) tx.update(syncQueue).set(values).where(eq(syncQueue.id, id)).run();
  else
    tx.insert(syncQueue)
      .values({
        ...values,
        id,
        entityType: params.entityType,
        entityId: params.entityId,
        deviceId: 'mobile-app',
        createdAt: new Date().toISOString(),
      })
      .run();
  return id;
}
export async function enqueue(params: Parameters<typeof enqueueInTransaction>[1]): Promise<string> {
  return db.transaction((tx) => enqueueInTransaction(tx, params));
}
export async function markCompleted(operationId: string): Promise<void> {
  db.update(syncQueue)
    .set({ status: 'completed', lastError: null, lastAttemptAt: new Date().toISOString() })
    .where(eq(syncQueue.id, operationId))
    .run();
}
export async function handleError(
  op: { id: string; attempts: number },
  error: Error
): Promise<void> {
  db.update(syncQueue)
    .set({
      status: 'failed',
      attempts: op.attempts + 1,
      lastError: error.message,
      lastAttemptAt: new Date().toISOString(),
    })
    .where(eq(syncQueue.id, op.id))
    .run();
}
