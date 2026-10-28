import { count, getTableColumns, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { FORM_ARRAY_FIELDS } from '~/db/formArrayFields';
import { forms, pins, syncQueue, syncInflight } from '~/db/schema';
import { mapPinDbToPin, sanitizeFormForDb, sanitizePinForDb } from '~/db/utils';
import { fetchForms } from '~/services/api/formsApi';
import { fetchPins } from '~/services/api/pinsApi';
import { db } from '~/services/drizzleDb';
import { deleteImageByFilename } from '~/services/images/ImageManager';
import { assertSafeImageComponent } from '~/services/images/imagePaths';

import { getQueueMetrics } from './queue/syncQueue';
import { clearLastSyncTimestamp, updateLastSyncTimestamp } from './syncMetadata';
import { getTransferState, runTransfer } from './transferCoordinator';

export async function getLocalDataSummary() {
  const pinCounts = db
    .select({
      total: count(),
      unsynced: sql<number>`coalesce(sum(case when ${pins.status} = 'synced' then 0 else 1 end), 0)`,
    })
    .from(pins)
    .get()!;
  const formCounts = db
    .select({
      total: count(),
      unsynced: sql<number>`coalesce(sum(case when ${forms.status} = 'synced' then 0 else 1 end), 0)`,
    })
    .from(forms)
    .get()!;
  const metrics = await getQueueMetrics();
  return {
    pins: pinCounts.total,
    forms: formCounts.total,
    pending: metrics.pending,
    failed: metrics.failed,
    unsynced: pinCounts.unsynced + formCounts.unsynced,
  };
}

function validateRow(table: SQLiteTable, row: Record<string, unknown>) {
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    const value = row[key];
    if (value == null) {
      if (column.notNull)
        throw new Error(`Downloaded record is missing ${key}. Nothing was downloaded.`);
    } else if (column.dataType === 'date') {
      if (!(value instanceof Date) || Number.isNaN(value.getTime()))
        throw new Error(`Invalid date: ${key}`);
    } else if (
      typeof value !== column.dataType ||
      (typeof value === 'number' && !Number.isFinite(value))
    ) {
      throw new Error(`Invalid downloaded field: ${key}`);
    }
  }
  if (!row.id || typeof row.id !== 'string') throw new Error('Downloaded record has no ID.');
}

function validateRawDates(row: { createdAt: unknown; updatedAt?: unknown }) {
  for (const key of ['createdAt', 'updatedAt'] as const) {
    const value = row[key];
    if (key === 'updatedAt' && value == null) continue;
    if (!(value instanceof Date) && typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`Invalid downloaded ${key}.`);
    }
    if (Number.isNaN(new Date(value).getTime())) throw new Error(`Invalid downloaded ${key}.`);
  }
}

/** Internal: caller must already hold the setup or download lock. */
export async function downloadSnapshotIntoEmptyDatabase(): Promise<{
  pins: number;
  forms: number;
}> {
  if (!['setup', 'download'].includes(getTransferState().kind ?? ''))
    throw new Error('Download lock required.');
  const local = await getLocalDataSummary();
  if (local.pins || local.forms || local.pending || local.failed) {
    throw new Error(
      'Download requires an empty device. Upload changes and clear local data first.'
    );
  }
  const pinResponse = await fetchPins();
  if (!pinResponse.success) throw new Error(pinResponse.error);
  const formResponse = await fetchForms();
  if (!formResponse.success) throw new Error(formResponse.error);
  if (!Array.isArray(pinResponse.data) || !Array.isArray(formResponse.data))
    throw new Error('Invalid server snapshot.');
  const localPins = pinResponse.data.map((pin) => {
    if (!pin || !Array.isArray(pin.images) || pin.images.some((image) => typeof image !== 'string'))
      throw new Error('Invalid pin images.');
    assertSafeImageComponent(pin.id);
    pin.images.forEach(assertSafeImageComponent);
    validateRawDates(pin);
    const row = sanitizePinForDb({ ...pin, status: 'synced' });
    validateRow(pins, row);
    if (row.lat < -90 || row.lat > 90 || row.lng < -180 || row.lng > 180)
      throw new Error('Invalid pin coordinates.');
    return row;
  });
  const pinIds = new Set(localPins.map((pin) => pin.id));
  if (pinIds.size !== localPins.length) throw new Error('Duplicate pins in server snapshot.');
  const localForms = formResponse.data.map((form) => {
    if (!form || !pinIds.has(form.pinId))
      throw new Error('Downloaded form has a missing parent pin.');
    validateRawDates(form);
    for (const field of FORM_ARRAY_FIELDS) {
      const value = form[field];
      if (
        value != null &&
        (!Array.isArray(value) || value.some((answer) => typeof answer !== 'string'))
      ) {
        throw new Error(`Invalid downloaded answers: ${field}. Nothing was downloaded.`);
      }
    }
    const row = sanitizeFormForDb({ ...form, status: 'synced' });
    validateRow(forms, row);
    return row;
  });
  if (new Set(localForms.map((form) => form.id)).size !== localForms.length)
    throw new Error('Duplicate forms in server snapshot.');
  db.transaction((tx) => {
    for (const pin of localPins) tx.insert(pins).values(pin).run();
    for (const form of localForms) tx.insert(forms).values(form).run();
  });
  await updateLastSyncTimestamp();
  return { pins: localPins.length, forms: localForms.length };
}

export async function downloadLatest() {
  return runTransfer('download', downloadSnapshotIntoEmptyDatabase);
}

export async function clearLocalData(): Promise<{ cleanupWarnings: string[] }> {
  return runTransfer('clear', async () => {
    const summary = await getLocalDataSummary();
    if (summary.pending || summary.failed || summary.unsynced)
      throw new Error('Upload all pending or failed changes before clearing local data.');
    const localPins = db.select().from(pins).all().map(mapPinDbToPin);
    // Fail before deleting records if the metadata store is unavailable.
    await clearLastSyncTimestamp();
    db.transaction((tx) => {
      tx.delete(forms).run();
      tx.delete(pins).run();
      tx.delete(syncQueue).run();
      tx.delete(syncInflight).run();
    });
    const cleanupWarnings: string[] = [];
    for (const pin of localPins) {
      for (const filename of pin.images) {
        try {
          await deleteImageByFilename(pin.id, filename);
        } catch {
          cleanupWarnings.push(`Could not remove cached image for ${pin.name || pin.id}.`);
        }
      }
    }
    return { cleanupWarnings };
  });
}
