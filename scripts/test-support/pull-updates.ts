// QA-only snapshot/reconciliation tools for the proposed future server protocol.
// The shipped app downloads through localDataTransfer into an empty device.
import type { Pin, Form } from '@assetmapping/shared-types';
import { and, eq, inArray } from 'drizzle-orm';

import { FORM_ARRAY_FIELDS } from '~/db/formArrayFields';
import { pins, forms, syncQueue, syncInflight } from '~/db/schema';
import { sanitizePinForDb, sanitizeFormForDb, mapPinDbToPin } from '~/db/utils';
import { request } from '~/services/api/client';
import { fetchForm, fetchForms, fetchFormsSince } from '~/services/api/formsApi';
import { fetchPin, fetchPins, fetchPinsSince } from '~/services/api/pinsApi';
import { db } from '~/services/drizzleDb';
import { deleteImagesByFilename } from '~/services/images/ImageManager';

import { sameStoredRow } from './rowComparison';

type EntityType = 'pin' | 'form';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Cleanup = () => Promise<void>;

function hasLocalChanges(tx: Transaction, type: EntityType, id: string) {
  if (
    tx
      .select({ key: syncInflight.key })
      .from(syncInflight)
      .where(and(eq(syncInflight.entityType, type), eq(syncInflight.entityId, id)))
      .get()
  )
    return true;
  return !!tx
    .select({ id: syncQueue.id })
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.entityType, type),
        eq(syncQueue.entityId, id),
        inArray(syncQueue.status, ['pending', 'failed'])
      )
    )
    .get();
}

function processPinData(tx: Transaction, data: Pin): Cleanup | undefined {
  // Includes pending deletions: do not resurrect a row while its delete is waiting to upload.
  if (hasLocalChanges(tx, 'pin', data.id)) return;
  const row = sanitizePinForDb({ ...data, status: 'synced' });
  const existing = tx.select().from(pins).where(eq(pins.id, data.id)).get();
  if (existing && (existing.version > row.version || sameStoredRow(existing, row))) return;
  if (existing) tx.update(pins).set(row).where(eq(pins.id, data.id)).run();
  else tx.insert(pins).values(row).run();
  if (existing) {
    const backendImages = new Set(data.images || []);
    const removed = mapPinDbToPin(existing).images.filter((name) => !backendImages.has(name));
    if (removed.length) return () => deleteImagesByFilename(data.id, removed);
  }
}

function processFormData(tx: Transaction, data: Form): void {
  if (hasLocalChanges(tx, 'form', data.id)) return;
  // A local pin deletion must also protect its forms from being reintroduced.
  const pinDelete = tx
    .select({ id: syncQueue.id })
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.entityType, 'pin'),
        eq(syncQueue.entityId, data.pinId),
        eq(syncQueue.operation, 'delete'),
        inArray(syncQueue.status, ['pending', 'failed'])
      )
    )
    .get();
  if (pinDelete) return;
  const row = sanitizeFormForDb({ ...data, status: 'synced' });
  const existing = tx.select().from(forms).where(eq(forms.id, data.id)).get();
  if (existing && (existing.version > row.version || sameStoredRow(existing, row))) return;
  if (existing) tx.update(forms).set(row).where(eq(forms.id, data.id)).run();
  else tx.insert(forms).values(row).run();
}

async function processBatch<T>(data: T[], processor: (tx: Transaction, item: T) => Cleanup | void) {
  // Bound synchronous work; yield between chunks so navigation/taps can be handled.
  for (let offset = 0; offset < data.length; offset += 20) {
    const cleanup = db.transaction((tx) => {
      const jobs: Cleanup[] = [];
      for (const item of data.slice(offset, offset + 20)) {
        const job = processor(tx, item);
        if (job) jobs.push(job);
      }
      return jobs;
    });
    // Filesystem cleanup is best effort after commit; database failures still reject
    // the pull, preventing the caller from advancing the sync cursor past lost rows.
    for (const job of cleanup) {
      try {
        await job();
      } catch {
        console.warn('Unable to remove stale local pin images.');
      }
    }
    if (offset + 20 < data.length) await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function fetchAndProcess<T>(
  fetcher: () => Promise<{ success: boolean; data?: T[]; error?: string }>,
  processor: (tx: Transaction, item: T) => Cleanup | void
) {
  const response = await fetcher();
  if (!response.success || !response.data)
    throw new Error(response.error || 'Unable to download changes.');
  await processBatch(response.data, processor);
}

async function fetchSingle<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  processor: (tx: Transaction, item: T) => Cleanup | void
) {
  const response = await fetcher();
  if (!response.success || !response.data)
    throw new Error(response.error || 'Unable to download changes.');
  await processBatch([response.data], processor);
}

export const pullPinUpdate = (id: string) => fetchSingle(() => fetchPin(id), processPinData);
export const pullFormUpdate = (id: string) => fetchSingle(() => fetchForm(id), processFormData);
export const pullAllPins = () => fetchAndProcess(fetchPins, processPinData);
export const pullAllForms = () => fetchAndProcess(fetchForms, processFormData);
export const pullPinsSince = (timestamp: number) =>
  fetchAndProcess(() => fetchPinsSince(timestamp), processPinData);
export const pullFormsSince = (timestamp: number) =>
  fetchAndProcess(() => fetchFormsSince(timestamp), processFormData);

// WebSocket deletions must change SQLite too; invalidating React Query does not
// update the lists backed by local queries. Keep unsent work for explicit resolution.
export function applyRemoteDeletion(type: EntityType, id: string): boolean {
  return db.transaction((tx) => {
    if (hasLocalChanges(tx, type, id)) return false;
    if (type === 'pin') {
      const children = tx.select({ id: forms.id }).from(forms).where(eq(forms.pinId, id)).all();
      if (children.some((child) => hasLocalChanges(tx, 'form', child.id))) return false;
      tx.delete(forms).where(eq(forms.pinId, id)).run();
      tx.delete(pins).where(eq(pins.id, id)).run();
    } else tx.delete(forms).where(eq(forms.id, id)).run();
    return true;
  });
}

type Snapshot = { protocolVersion: 1; pins: Pin[]; forms: Form[] };
type Candidate = { id: string; version: number; updatedAt: Date | null; status: string | null };

function validateSnapshot(value: Snapshot) {
  if (
    !value ||
    value.protocolVersion !== 1 ||
    !Array.isArray(value.pins) ||
    !Array.isArray(value.forms)
  )
    throw new Error('Unsupported server snapshot. Local data has been preserved.');
  const pinIds = new Set<string>();
  const formIds = new Set<string>();
  const validMeta = (row: Pin | Form) =>
    row &&
    typeof row.id === 'string' &&
    row.id.length > 0 &&
    Number.isSafeInteger(row.version) &&
    row.version > 0 &&
    Number.isFinite(new Date(row.createdAt).getTime());
  for (const pin of value.pins) {
    if (
      !validMeta(pin) ||
      pinIds.has(pin.id) ||
      typeof pin.name !== 'string' ||
      !Number.isFinite(pin.lat) ||
      !Number.isFinite(pin.lng) ||
      Math.abs(pin.lat) > 90 ||
      Math.abs(pin.lng) > 180 ||
      !Array.isArray(pin.images) ||
      pin.images.some((v) => typeof v !== 'string')
    )
      throw new Error('Invalid pin snapshot. Local data has been preserved.');
    pinIds.add(pin.id);
  }
  for (const form of value.forms) {
    if (
      !validMeta(form) ||
      formIds.has(form.id) ||
      !pinIds.has(form.pinId) ||
      ['name', 'village', 'villageId'].some((key) => typeof form[key as keyof Form] !== 'string') ||
      FORM_ARRAY_FIELDS.some(
        (key) => !Array.isArray(form[key]) || form[key].some((v) => typeof v !== 'string')
      ) ||
      (form.age != null && (!Number.isSafeInteger(form.age) || form.age < 0))
    )
      throw new Error('Invalid form snapshot. Local data has been preserved.');
    formIds.add(form.id);
  }
}

// The existing server has two independent collection reads. Validate the pair
// before writing. Confirm missing clean rows individually before deleting them.
// A pin created between the two reads can require a later refresh.
export async function pullLegacyCollections(): Promise<void> {
  const candidates = (table: typeof forms | typeof pins) =>
    db
      .select({
        id: table.id,
        version: table.version,
        updatedAt: table.updatedAt,
        status: table.status,
      })
      .from(table)
      .where(eq(table.status, 'synced'))
      .all();
  const cleanPins = candidates(pins),
    cleanForms = candidates(forms);
  const pinResponse = await fetchPins();
  if (!pinResponse.success || !Array.isArray(pinResponse.data))
    throw new Error(!pinResponse.success ? pinResponse.error : 'Invalid pin collection.');
  const formResponse = await fetchForms();
  if (!formResponse.success || !Array.isArray(formResponse.data))
    throw new Error(!formResponse.success ? formResponse.error : 'Invalid form collection.');
  validateSnapshot({ protocolVersion: 1, pins: pinResponse.data, forms: formResponse.data });
  await processBatch(pinResponse.data, processPinData);
  await processBatch(formResponse.data, processFormData);
  const pruneConfirmedMissing = async (
    type: EntityType,
    before: Candidate[],
    remoteIds: Set<string>
  ) => {
    const table = type === 'pin' ? pins : forms;
    for (const candidate of before) {
      if (remoteIds.has(candidate.id)) continue;
      const confirmation = await (type === 'pin' ? fetchPin : fetchForm)(candidate.id);
      // A timeout, 500, or malformed successful reply proves nothing about absence.
      if (confirmation.success || !/^HTTP 404\b/.test(confirmation.error ?? '')) continue;
      const current = db.select().from(table).where(eq(table.id, candidate.id)).get();
      if (
        current?.status !== 'synced' ||
        current.version !== candidate.version ||
        current.updatedAt?.getTime() !== candidate.updatedAt?.getTime()
      )
        continue;
      applyRemoteDeletion(type, candidate.id);
    }
  };
  await pruneConfirmedMissing('form', cleanForms, new Set(formResponse.data.map((row) => row.id)));
  await pruneConfirmedMissing('pin', cleanPins, new Set(pinResponse.data.map((row) => row.id)));
}

// A full, consistent server snapshot also catches deletions missed while offline.
// Only remove rows that were clean before this request and are still unchanged.
export async function pullSnapshot(): Promise<void> {
  const cleanPins = db
    .select({ id: pins.id, version: pins.version, updatedAt: pins.updatedAt, status: pins.status })
    .from(pins)
    .where(eq(pins.status, 'synced'))
    .all();
  const cleanForms = db
    .select({
      id: forms.id,
      version: forms.version,
      updatedAt: forms.updatedAt,
      status: forms.status,
    })
    .from(forms)
    .where(eq(forms.status, 'synced'))
    .all();
  const originallyPending = new Set(
    db
      .select({ type: syncQueue.entityType, id: syncQueue.entityId })
      .from(syncQueue)
      .where(inArray(syncQueue.status, ['pending', 'failed']))
      .all()
      .map((row) => `${row.type}:${row.id}`)
  );
  const response = await request<Snapshot>('/api/sync/snapshot');
  if (!response.success) throw new Error(response.error);
  validateSnapshot(response.data);
  const remotePinIds = new Set(response.data.pins.map((pin) => pin.id));
  const remoteFormIds = new Set(response.data.forms.map((form) => form.id));
  await processBatch(response.data.pins, processPinData);
  await processBatch(response.data.forms, processFormData);
  const prune = async (type: EntityType, candidates: Candidate[], remoteIds: Set<string>) => {
    const missing = candidates.filter(
      (row) => !remoteIds.has(row.id) && !originallyPending.has(`${type}:${row.id}`)
    );
    for (let offset = 0; offset < missing.length; offset += 20) {
      db.transaction((tx) => {
        const table = type === 'pin' ? pins : forms;
        for (const before of missing.slice(offset, offset + 20)) {
          const current = tx
            .select({ version: table.version, updatedAt: table.updatedAt, status: table.status })
            .from(table)
            .where(eq(table.id, before.id))
            .get();
          if (
            !current ||
            current.status !== 'synced' ||
            current.version !== before.version ||
            current.updatedAt?.getTime() !== before.updatedAt?.getTime() ||
            hasLocalChanges(tx, type, before.id)
          )
            continue;
          if (type === 'pin') {
            const children = tx
              .select({ id: forms.id })
              .from(forms)
              .where(eq(forms.pinId, before.id))
              .all();
            if (children.some((child) => hasLocalChanges(tx, 'form', child.id))) continue;
            tx.delete(forms).where(eq(forms.pinId, before.id)).run();
          }
          tx.delete(table).where(eq(table.id, before.id)).run();
        }
      });
      if (offset + 20 < missing.length) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  await prune('form', cleanForms, remoteFormIds);
  await prune('pin', cleanPins, remotePinIds);
}
