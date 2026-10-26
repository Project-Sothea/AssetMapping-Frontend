import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { forms, pins, syncQueue, syncInflight } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { checkLegacyUpload } from '~/services/sync/legacySync';
import { isLegacySync } from '~/services/sync/protocol';
import { safeJsonParse } from '~/shared/utils/parsing';

import { syncPin, syncForm } from './syncOperations';
import { Operation, EntityType } from './types';

export type QueueItem = typeof syncQueue.$inferSelect;
type QueueWriter = Pick<typeof db, 'select' | 'update' | 'insert'>;
type EnqueueParams = {
  operation: Operation;
  entityType: EntityType;
  entityId: string;
  payload: Record<string, unknown>;
};

// Synchronous by design: the entity write and its outbox entry share one SQLite transaction.
export function enqueueInTransaction(writer: QueueWriter, params: EnqueueParams): string {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify(params.payload);
  const existing = writer
    .select()
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.entityId, params.entityId),
        eq(syncQueue.entityType, params.entityType),
        inArray(syncQueue.status, ['pending', 'failed'])
      )
    )
    .get();
  const revision = uuidv4();
  if (existing) {
    writer
      .update(syncQueue)
      .set({
        operation:
          existing.operation === 'create' && params.operation === 'update'
            ? 'create'
            : params.operation,
        payload,
        status: 'pending',
        attempts: 0,
        lastError: null,
        sequenceNumber: Date.now(),
        idempotencyKey: revision,
      })
      .where(eq(syncQueue.id, existing.id))
      .run();
    return existing.id;
  }
  const id = uuidv4();
  writer
    .insert(syncQueue)
    .values({
      id,
      operation: params.operation,
      entityType: params.entityType,
      entityId: params.entityId,
      idempotencyKey: revision,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      sequenceNumber: Date.now(),
      deviceId: 'mobile-app',
      createdAt: timestamp,
    })
    .run();
  return id;
}

export async function enqueue(params: EnqueueParams): Promise<string> {
  return db.transaction((tx) => enqueueInTransaction(tx, params));
}

export function isCurrentOperation(op: QueueItem): boolean {
  return !!db
    .select({ id: syncQueue.id })
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.id, op.id),
        eq(syncQueue.idempotencyKey, op.idempotencyKey),
        eq(syncQueue.status, 'pending')
      )
    )
    .get();
}

export async function processOperation(
  op: QueueItem
): Promise<Record<string, unknown> | undefined> {
  if (
    !['pin', 'form'].includes(op.entityType) ||
    !['create', 'update', 'delete'].includes(op.operation)
  )
    throw new Error('Invalid local outbox operation. Saved data needs review.');
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(op.payload);
  } catch {
    throw new Error('Invalid local outbox payload. Saved data needs review.');
  }
  if (!payload || typeof payload !== 'object' || payload.id !== op.entityId)
    throw new Error('Outbox identity mismatch. Saved data needs review.');
  const recovered = isLegacySync
    ? await checkLegacyUpload(op.entityType as EntityType, op.operation as Operation, payload)
    : undefined;
  const result =
    recovered ??
    (op.entityType === 'pin'
      ? await syncPin(op.operation as Operation, payload as any, op.idempotencyKey)
      : await syncForm(op.operation as Operation, payload as any, op.idempotencyKey));
  if (
    !result ||
    typeof result.id !== 'string' ||
    result.id.toLowerCase() !== op.entityId.toLowerCase()
  )
    throw new Error('Invalid server acknowledgement. This change remains saved locally.');
  if (op.operation === 'delete') {
    if (result.deleted !== true) throw new Error('The server did not confirm deletion.');
  } else {
    if (
      typeof result.version !== 'number' ||
      !Number.isSafeInteger(result.version) ||
      (isLegacySync
        ? result.version < (op.operation === 'create' ? 1 : Number(payload.version))
        : result.version !== (op.operation === 'create' ? 1 : Number(payload.version) + 1))
    )
      throw new Error('The server did not confirm a saved version.');
    for (const [key, value] of Object.entries(payload)) {
      if (
        ['id', 'createdAt', 'updatedAt', 'version', 'status'].includes(key) ||
        value === undefined
      )
        continue;
      // Postgres stores legacy map coordinates as REAL (32-bit); compare those
      // within its precision. Survey answers and all other values must match exactly.
      if (
        ['lat', 'lng'].includes(key) &&
        typeof value === 'number' &&
        typeof result[key] === 'number' &&
        Math.abs(value - (result[key] as number)) < 0.00001
      )
        continue;
      if (JSON.stringify(value) !== JSON.stringify(result[key]))
        throw new Error(
          'The server confirmed different saved content. Your local answer is preserved for review.'
        );
    }
  }
  return result;
}

// An acknowledgement for an older upload must never complete a newer local edit.
export function markCompleted(op: QueueItem, syncedData?: Record<string, unknown>): void {
  db.transaction((tx) => {
    const current = tx.select().from(syncQueue).where(eq(syncQueue.id, op.id)).get();
    tx.delete(syncInflight).where(eq(syncInflight.key, op.idempotencyKey)).run();
    if (!current || current.status === 'completed') return;
    const sameRevision = current.idempotencyKey === op.idempotencyKey;
    const version = typeof syncedData?.version === 'number' ? syncedData.version : undefined;
    const table = op.entityType === 'pin' ? pins : forms;
    const updates = {
      ...(sameRevision ? { status: 'synced' } : {}),
      ...(sameRevision &&
      typeof syncedData?.createdAt === 'string' &&
      Number.isFinite(new Date(syncedData.createdAt).getTime())
        ? { createdAt: new Date(syncedData.createdAt) }
        : {}),
      ...(sameRevision &&
      typeof syncedData?.updatedAt === 'string' &&
      Number.isFinite(new Date(syncedData.updatedAt).getTime())
        ? { updatedAt: new Date(syncedData.updatedAt) }
        : {}),
      ...(version === undefined ? {} : { version }),
    };
    if (Object.keys(updates).length)
      tx.update(table).set(updates).where(eq(table.id, op.entityId)).run();
    if (sameRevision) {
      tx.update(syncQueue)
        .set({ status: 'completed', lastAttemptAt: new Date().toISOString() })
        .where(eq(syncQueue.id, op.id))
        .run();
    } else if (version !== undefined) {
      // The newer payload has not been sent by this serial worker yet; carry forward the acknowledged version.
      tx.update(syncQueue)
        .set({
          operation: current.operation === 'delete' ? 'delete' : 'update',
          payload: JSON.stringify({ ...safeJsonParse(current.payload, {}), version }),
          idempotencyKey: uuidv4(),
        })
        .where(eq(syncQueue.id, op.id))
        .run();
    }
  });
}

// Stage before any HTTP request. A process death cannot forget which payload
// might have committed, even if the worker has since edited the same record.
export function stageOperation(op: QueueItem): void {
  db.insert(syncInflight)
    .values({
      key: op.idempotencyKey,
      queueId: op.id,
      entityType: op.entityType,
      entityId: op.entityId,
      operation: JSON.stringify(op),
      status: 'pending',
    })
    .onConflictDoNothing()
    .run();
}

export function pendingInflight(): QueueItem[] {
  return db
    .select()
    .from(syncInflight)
    .where(eq(syncInflight.status, 'pending'))
    .all()
    .map((row) => JSON.parse(row.operation) as QueueItem);
}

export function hasInflight(type: string, id: string): boolean {
  return !!db
    .select({ key: syncInflight.key })
    .from(syncInflight)
    .where(and(eq(syncInflight.entityType, type), eq(syncInflight.entityId, id)))
    .get();
}

export async function handleError(op: QueueItem, error: Error): Promise<void> {
  const attempts = op.attempts + 1;
  const retryable = /network|timeout|timed out|fetch failed|connection|HTTP 50[0234]/i.test(
    error.message
  );
  const status = retryable && attempts < op.maxAttempts ? 'pending' : 'failed';
  const update = {
    attempts,
    lastError: error.message,
    lastAttemptAt: new Date().toISOString(),
    status,
  };
  db.transaction((tx) => {
    tx.update(syncQueue)
      .set(update)
      .where(and(eq(syncQueue.id, op.id), eq(syncQueue.idempotencyKey, op.idempotencyKey)))
      .run();
    // A 4xx response proves that this request did not commit. A timeout, process
    // interruption or local acknowledgement-write failure leaves outcome unknown.
    if (/HTTP 4\d\d/.test(error.message))
      tx.delete(syncInflight).where(eq(syncInflight.key, op.idempotencyKey)).run();
    else
      tx.update(syncInflight)
        .set({ status, operation: JSON.stringify({ ...op, ...update }) })
        .where(eq(syncInflight.key, op.idempotencyKey))
        .run();
  });
}
