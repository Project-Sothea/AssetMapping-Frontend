/**
 * PinService - Simple CRUD operations
 *
 * Key principles:
 * 1. Save pins to database immediately (optimistic)
 * 2. Queue for background sync to backend
 * 3. Images are just arrays of strings (no complex processing)
 * 4. Let the form/UI handle image picking and saving
 */

import type { Pin } from '@assetmapping/shared-types';
import { and, eq, inArray } from 'drizzle-orm';

import { forms, pins, syncQueue } from '~/db/schema';
import { mapPinDbToPin, sanitizePinForDb } from '~/db/utils';
import { validateLocal } from '~/db/validateLocal';
import { db } from '~/services/drizzleDb';
import * as ImageManager from '~/services/images/ImageManager';
import { enqueueInTransaction } from '~/services/sync/queue/queueOperations';
import { scheduleNextProcess } from '~/services/sync/queue/queueState';
import { processQueue } from '~/services/sync/queue/syncQueue';
import { sameContent } from '~/shared/utils/sameContent';

import { PinUpdate, PinValues } from '../types';

// ============================================
// CREATE
// ============================================

export async function createPin(pin: PinValues): Promise<Pin> {
  const newPin: Pin = {
    ...pin,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    status: 'unsynced',
  };

  validateLocal('pin', newPin);
  db.transaction((tx) => {
    tx.insert(pins).values(sanitizePinForDb(newPin)).run();
    enqueueInTransaction(tx, {
      operation: 'create',
      entityType: 'pin',
      entityId: newPin.id,
      payload: newPin,
    });
  });
  scheduleNextProcess(processQueue);

  return newPin;
}

// ============================================
// UPDATE
// ============================================

export async function updatePin(id: string, updates: PinUpdate, baseline?: Pin): Promise<Pin> {
  const updated = db.transaction((tx) => {
    const row = tx.select().from(pins).where(eq(pins.id, id)).get();
    if (!row) throw new Error('This pin no longer exists on this device.');
    const existing = mapPinDbToPin(row);
    if (baseline && !sameContent(existing, baseline))
      throw new Error(
        'This pin changed while you were editing. Review its saved details before trying again.'
      );
    const next: Pin = {
      ...existing,
      ...updates,
      id,
      version: existing.version,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      status: 'unsynced',
    };
    validateLocal('pin', next);
    tx.update(pins).set(sanitizePinForDb(next)).where(eq(pins.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'update',
      entityType: 'pin',
      entityId: id,
      payload: next,
    });
    return next;
  });
  scheduleNextProcess(processQueue);

  return updated;
}

// ============================================
// DELETE
// ============================================

export async function deletePin(id: string, baseline?: Pin): Promise<void> {
  const existing = db.transaction((tx) => {
    const row = tx.select().from(pins).where(eq(pins.id, id)).get();
    if (!row) throw new Error('This pin no longer exists on this device.');
    const existing = mapPinDbToPin(row);
    if (baseline && !sameContent(existing, baseline))
      throw new Error(
        'This pin changed since you opened it. Review its saved details before deleting.'
      );
    const children = tx.select({ id: forms.id }).from(forms).where(eq(forms.pinId, id)).all();
    for (const child of children) {
      tx.delete(syncQueue)
        .where(
          and(
            eq(syncQueue.entityType, 'form'),
            eq(syncQueue.entityId, child.id),
            inArray(syncQueue.status, ['pending', 'failed'])
          )
        )
        .run();
    }
    tx.delete(forms).where(eq(forms.pinId, id)).run();
    tx.delete(pins).where(eq(pins.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'delete',
      entityType: 'pin',
      entityId: id,
      payload: existing,
    });
    return existing;
  });
  scheduleNextProcess(processQueue);
  // File cleanup follows a successful commit, so a failed save cannot discard images.
  if (existing.images?.length) {
    try {
      await ImageManager.deleteImagesByFilename(id, existing.images);
    } catch {
      console.warn('Unable to remove deleted pin images from this device.');
    }
  }
}

// ============================================
// READ
// ============================================

export async function getPinById(id: string): Promise<Pin | null> {
  const result = db.select().from(pins).where(eq(pins.id, id)).limit(1).get();
  return result ? mapPinDbToPin(result) : null;
}
