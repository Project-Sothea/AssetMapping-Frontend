import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { forms, pins, syncQueue, syncInflight } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { checkLegacyUpload } from '~/services/sync/legacySync';
import { isLegacySync } from '~/services/sync/protocol';
import { safeJsonParse } from '~/shared/utils/parsing';

import { validateServerAcknowledgement } from './acknowledgement';
import { syncPin, syncForm } from './syncOperations';
import { Operation, EntityType } from './types';
import {
  ATOMIC_WRITE_ORIGIN,
  QueuedOperationValidationError,
  validateQueuedOperation,
  normalizeQueuedPayload,
} from './validateQueuedOperation';

export type QueueItem = typeof syncQueue.$inferSelect;
type QueueWriter = Pick<typeof db, 'select' | 'update' | 'insert' | 'delete'>;
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
    const inflight = writer
      .select({ key: syncInflight.key })
      .from(syncInflight)
      .where(
        and(
          eq(syncInflight.entityType, params.entityType),
          eq(syncInflight.entityId, params.entityId)
        )
      )
      .get();
    if (
      params.operation === 'delete' &&
      existing.status === 'pending' &&
      existing.operation === 'create' &&
      existing.writeOrigin === ATOMIC_WRITE_ORIGIN &&
      existing.attempts === 0 &&
      !existing.lastAttemptAt &&
      !inflight
    ) {
      writer.delete(syncQueue).where(eq(syncQueue.id, existing.id)).run();
      return existing.id;
    }
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
        // A new edit cannot prove that an older unjournaled create was never
        // transmitted. Keep that uncertainty until an explicit delete or ACK.
        writeOrigin:
          existing.operation === 'create' &&
          params.operation === 'update' &&
          existing.writeOrigin !== ATOMIC_WRITE_ORIGIN
            ? null
            : ATOMIC_WRITE_ORIGIN,
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
      writeOrigin: ATOMIC_WRITE_ORIGIN,
    })
    .run();
  return id;
}

export async function processOperation(
  op: QueueItem
): Promise<Record<string, unknown> | undefined> {
  const payload = validateQueuedOperation(op);
  // Validation and journaling share one synchronous turn before any HTTP work.
  insertJournal(op);
  const expected = normalizeQueuedPayload(op, payload);
  // Old journal request bodies retain their exact meaning for durable receipts.
  // New atomic writes use a complete, deterministic business snapshot on wire.
  const wirePayload = op.writeOrigin === ATOMIC_WRITE_ORIGIN ? expected : payload;
  const recovered = isLegacySync
    ? await checkLegacyUpload(op.entityType as EntityType, op.operation as Operation, expected)
    : undefined;
  const result =
    recovered ??
    (op.entityType === 'pin'
      ? await syncPin(op.operation as Operation, wirePayload as any, op.idempotencyKey)
      : await syncForm(op.operation as Operation, wirePayload as any, op.idempotencyKey));
  validateServerAcknowledgement(op.entityId, op.operation as Operation, expected, result);
  return result;
}

// A confirmed parent deletion cascades to its forms on the server. Until that
// confirmation, keep every child revision for recovery; afterwards those revisions
// must not replay against records that the acknowledged cascade has removed.
function retireDeletedPinChildren(tx: LocalTransaction, pinId: string): void {
  const belongsToPin = (payload: string): boolean => {
    try {
      return JSON.parse(payload)?.pinId === pinId;
    } catch {
      // Malformed recovery records need review, not silent removal.
      return false;
    }
  };
  for (const child of tx
    .select()
    .from(syncInflight)
    .where(eq(syncInflight.entityType, 'form'))
    .all()) {
    let operation: QueueItem;
    try {
      operation = JSON.parse(child.operation);
    } catch {
      continue;
    }
    if (operation?.entityType === 'form' && belongsToPin(operation.payload))
      tx.delete(syncInflight).where(eq(syncInflight.key, child.key)).run();
  }
  for (const child of tx
    .select()
    .from(syncQueue)
    .where(and(eq(syncQueue.entityType, 'form'), inArray(syncQueue.status, ['pending', 'failed'])))
    .all()) {
    if (belongsToPin(child.payload)) tx.delete(syncQueue).where(eq(syncQueue.id, child.id)).run();
  }
}

// An acknowledgement for an older upload must never complete a newer local edit.
export function markCompleted(op: QueueItem, syncedData?: Record<string, unknown>): void {
  db.transaction((tx) => {
    const current = tx.select().from(syncQueue).where(eq(syncQueue.id, op.id)).get();
    tx.delete(syncInflight).where(eq(syncInflight.key, op.idempotencyKey)).run();
    if (op.entityType === 'pin' && op.operation === 'delete' && syncedData?.deleted === true)
      retireDeletedPinChildren(tx, op.entityId);
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
  validateQueuedOperation(op);
  insertJournal(op);
}

function insertJournal(op: QueueItem): void {
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
    .map((row) => {
      let stored: Partial<QueueItem> = {};
      try {
        const parsed = JSON.parse(row.operation);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed;
      } catch {
        /* Preserve raw recovery data; the per-operation validator reports it. */
      }
      // Outer identities identify the actual journal row even when its inner
      // snapshot is malformed. Never rewrite that original snapshot on failure.
      return {
        createdAt: '',
        operation: 'invalid',
        payload: JSON.stringify({ id: row.entityId }),
        attempts: 0,
        maxAttempts: 3,
        lastError: null,
        lastAttemptAt: null,
        sequenceNumber: null,
        dependsOn: null,
        deviceId: null,
        writeOrigin: null,
        ...stored,
        id: row.queueId,
        idempotencyKey: row.key,
        entityType: row.entityType,
        entityId: row.entityId,
        status: row.status,
      } as QueueItem;
    });
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
    if (error instanceof QueuedOperationValidationError) {
      tx.update(syncInflight)
        .set({ status: 'failed' })
        .where(eq(syncInflight.key, op.idempotencyKey))
        .run();
      return;
    }
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

export type LocalTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
