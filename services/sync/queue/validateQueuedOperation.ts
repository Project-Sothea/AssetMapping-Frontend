import { and, eq, getTableColumns } from 'drizzle-orm';

import { FORM_ARRAY_FIELDS } from '~/db/formArrayFields';
import { forms, pins, syncInflight, syncQueue } from '~/db/schema';
import { mapFormDbToForm, mapPinDbToPin } from '~/db/utils';
import { validateLocal } from '~/db/validateLocal';
import { db } from '~/services/drizzleDb';

export const ATOMIC_WRITE_ORIGIN = 'atomic-v1';
type QueuedOperation = typeof syncQueue.$inferSelect;
const metadata = new Set(['id', 'createdAt', 'updatedAt', 'version', 'status']);

export class QueuedOperationValidationError extends Error {}

function reject(reason: string): never {
  throw new QueuedOperationValidationError(
    `This saved change needs review before uploading: ${reason}. It remains on this device. Contact the app team; other changes can still upload.`
  );
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sameRevision(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return [
    'id',
    'idempotencyKey',
    'entityType',
    'entityId',
    'operation',
    'payload',
    'writeOrigin',
  ].every((key) => (a[key] ?? null) === (b[key] ?? null));
}

/** Pure, deterministic business meaning of one immutable queued snapshot. */
export function normalizeQueuedPayload(
  op: Pick<QueuedOperation, 'entityType' | 'operation'>,
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (op.operation === 'delete') return payload;
  const columns = getTableColumns(op.entityType === 'form' ? forms : pins);
  const arrays = new Set<string>(op.entityType === 'form' ? FORM_ARRAY_FIELDS : ['images']);
  const normalized = { ...payload };
  for (const key of Object.keys(columns)) {
    if (!metadata.has(key) && payload[key] === undefined)
      normalized[key] = arrays.has(key) ? [] : null;
  }
  return normalized;
}

function snapshot(op: QueuedOperation, payload: Record<string, unknown>, compactDelete: boolean) {
  const type = op.entityType as 'pin' | 'form';
  if (payload.id !== op.entityId) reject('the record identity does not match');
  if (!Number.isSafeInteger(payload.version) || (payload.version as number) < 1)
    reject('the saved version is missing or invalid');
  if (type === 'form' && (typeof payload.pinId !== 'string' || !payload.pinId.trim()))
    reject('the household pin identity is missing');
  if (compactDelete) {
    const allowed = new Set(['id', 'version', ...(type === 'form' ? ['pinId'] : [])]);
    if (Object.keys(payload).every((key) => allowed.has(key))) return;
  }
  const columns = getTableColumns(type === 'form' ? forms : pins);
  if (op.operation === 'update' && op.writeOrigin !== ATOMIC_WRITE_ORIGIN) {
    const missing = Object.keys(columns).find(
      (key) => !metadata.has(key) && !Object.prototype.hasOwnProperty.call(payload, key)
    );
    if (missing)
      reject(`an older partial update omits ${missing}; its original upload needs team assistance`);
  }
  const typed = { ...payload };
  for (const [key, column] of Object.entries(columns)) {
    const value = payload[key];
    if (column.notNull && value == null) reject(`required field ${key} is missing`);
    if (column.dataType === 'date' && value != null) {
      if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date))
        reject(`field ${key} has an invalid date`);
      const date = new Date(value as string | number | Date);
      if (!Number.isFinite(date.getTime())) reject(`field ${key} has an invalid date`);
      typed[key] = date;
    }
  }
  try {
    validateLocal(type, typed);
  } catch (error) {
    reject(error instanceof Error ? error.message : 'the saved field types are invalid');
  }
}

function requireMatchingSavedRecord(
  op: QueuedOperation,
  payload: Record<string, unknown>,
  row: typeof pins.$inferSelect | typeof forms.$inferSelect
): void {
  const table = op.entityType === 'pin' ? pins : forms;
  if (row.version !== payload.version) reject('the queued version differs from the saved record');
  const arrays = new Set<string>(op.entityType === 'pin' ? ['images'] : FORM_ARRAY_FIELDS);
  for (const key of arrays) {
    const raw = (row as Record<string, unknown>)[key];
    if (raw == null || raw === '') continue;
    try {
      const values = JSON.parse(raw as string);
      if (!Array.isArray(values) || values.some((value) => typeof value !== 'string'))
        reject(`saved field ${key} is not a valid answer list`);
    } catch {
      reject(`saved field ${key} is not a valid answer list`);
    }
  }
  const current =
    op.entityType === 'pin'
      ? mapPinDbToPin(row as typeof pins.$inferSelect)
      : mapFormDbToForm(row as typeof forms.$inferSelect);
  const columns = getTableColumns(table);
  for (const key of Object.keys(columns)) {
    if (metadata.has(key)) continue;
    // Current services omit unanswered optionals on create; SQLite stores NULL
    // and its array adapter reads omitted lists as []. Do not conflate NULL with
    // blank strings, false or zero for scalar answers.
    const queued = payload[key] === undefined ? (arrays.has(key) ? [] : null) : payload[key];
    const saved = (current as Record<string, unknown>)[key] ?? null;
    if (JSON.stringify(queued) !== JSON.stringify(saved))
      reject(`the queued field ${key} differs from the saved record`);
  }
  if (
    op.entityType === 'form' &&
    !db
      .select({ id: pins.id })
      .from(pins)
      .where(eq(pins.id, String(payload.pinId)))
      .get()
  )
    reject('the current household pin is missing');
}

/** Validate without writing, so only the affected operation is held for review. */
export function validateQueuedOperation(op: QueuedOperation): Record<string, unknown> {
  if (
    !op ||
    !['pin', 'form'].includes(op.entityType) ||
    !['create', 'update', 'delete'].includes(op.operation)
  )
    reject('the operation type is invalid');
  for (const key of ['id', 'idempotencyKey', 'entityId'] as const)
    if (typeof op[key] !== 'string' || !op[key].trim()) reject('the operation identity is invalid');
  let payload: unknown;
  try {
    payload = JSON.parse(op.payload);
  } catch {
    reject('the saved payload is not valid JSON');
  }
  if (!object(payload)) reject('the saved payload is not a record');

  const journal = db
    .select()
    .from(syncInflight)
    .where(eq(syncInflight.key, op.idempotencyKey))
    .get();
  if (journal) {
    let stored: unknown;
    try {
      stored = JSON.parse(journal.operation);
    } catch {
      reject('the recovery journal is not valid JSON');
    }
    if (
      !object(stored) ||
      journal.queueId !== op.id ||
      journal.entityType !== op.entityType ||
      journal.entityId !== op.entityId ||
      !sameRevision(stored, op)
    )
      reject('the recovery journal does not match this operation');
    const latest = db.select().from(syncQueue).where(eq(syncQueue.id, op.id)).get();
    if (latest?.idempotencyKey === op.idempotencyKey && !sameRevision(latest, op))
      reject('the recovery journal differs from the queued revision');
    snapshot(op, payload, op.operation === 'delete');
    const table = op.entityType === 'pin' ? pins : forms;
    const row = db.select().from(table).where(eq(table.id, op.entityId)).get();
    if (op.operation === 'delete' && row)
      reject('the record still exists locally despite its deletion journal');
    if (latest && (latest.entityType !== op.entityType || latest.entityId !== op.entityId))
      reject('the newer queued revision has a different record identity');
    // A different queued revision proves that a newer edit was persisted with
    // its own outbox entry. A same-key/missing queue cannot explain newer local
    // answers, so never acknowledge an older payload as though those were sent.
    if (
      op.operation !== 'delete' &&
      row &&
      (!latest || latest.idempotencyKey === op.idempotencyKey)
    )
      requireMatchingSavedRecord(op, payload, row);
    // A missing row remains valid for a transmitted revision followed by delete.
    return payload;
  }

  snapshot(op, payload, false);
  const queued = db
    .select()
    .from(syncQueue)
    .where(and(eq(syncQueue.id, op.id), eq(syncQueue.idempotencyKey, op.idempotencyKey)))
    .get();
  if (!queued || !sameRevision(queued, op)) reject('the queued revision changed before uploading');
  const table = op.entityType === 'pin' ? pins : forms;
  const row = db.select().from(table).where(eq(table.id, op.entityId)).get();
  if (op.operation === 'delete') {
    if (op.writeOrigin !== ATOMIC_WRITE_ORIGIN || row)
      reject('this deletion has no verified local deletion record');
    return payload;
  }
  if (!row) reject('the current saved record is missing');
  requireMatchingSavedRecord(op, payload, row);
  return payload;
}
