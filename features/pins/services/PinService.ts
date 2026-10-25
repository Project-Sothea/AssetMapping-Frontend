/**
 * PinService - Simple CRUD operations
 *
 * Key principles:
 * 1. Save pins to database immediately (optimistic)
 * 2. Queue for explicit manual upload to backend
 * 3. Images are just arrays of strings (no complex processing)
 * 4. Let the form/UI handle image picking and saving
 */

import type { Pin } from '@assetmapping/shared-types';
import { eq, and } from 'drizzle-orm';

import { pins, forms, syncQueue } from '~/db/schema';
import { mapPinDbToPin, sanitizePinForDb } from '~/db/utils';
import { db } from '~/services/drizzleDb';
import * as ImageManager from '~/services/images/ImageManager';
import { enqueueInTransaction, outstanding } from '~/services/sync/queue/queueOperations';
import { assertLocalWritesAllowed } from '~/services/sync/transferCoordinator';

import { PinUpdate, PinValues } from '../types';

// ============================================
// CREATE
// ============================================

export async function createPin(pin: PinValues): Promise<Pin> {
  assertLocalWritesAllowed();
  const newPin: Pin = {
    ...pin,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    status: 'unsynced',
  };

  db.transaction((tx) => {
    tx.insert(pins).values(sanitizePinForDb(newPin)).run();
    enqueueInTransaction(tx, {
      operation: 'create',
      entityType: 'pin',
      entityId: newPin.id,
      payload: newPin,
    });
  });

  return newPin;
}

// ============================================
// UPDATE
// ============================================

export async function updatePin(id: string, updates: PinUpdate): Promise<Pin> {
  assertLocalWritesAllowed();
  const row = db.select().from(pins).where(eq(pins.id, id)).get();
  const existing = row ? mapPinDbToPin(row) : null;
  if (!existing) {
    throw new Error(`Pin ${id} not found`);
  }

  const updated: Pin = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
    status: 'unsynced',
  };

  db.transaction((tx) => {
    tx.update(pins).set(sanitizePinForDb(updated)).where(eq(pins.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'update',
      entityType: 'pin',
      entityId: id,
      payload: updated,
    });
  });

  return updated;
}

// ============================================
// DELETE
// ============================================

export async function deletePin(id: string): Promise<void> {
  assertLocalWritesAllowed();
  const row = db.select().from(pins).where(eq(pins.id, id)).get();
  const existing = row ? mapPinDbToPin(row) : null;
  if (!existing) throw new Error(`Pin ${id} not found`);

  db.transaction((tx) => {
    const children = tx.select().from(forms).where(eq(forms.pinId, id)).all();
    for (const child of children) {
      tx.delete(syncQueue)
        .where(and(eq(syncQueue.entityType, 'form'), eq(syncQueue.entityId, child.id), outstanding))
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
  });

  // Delete all local images when deleting the pin
  const filenames = existing.images || [];
  if (filenames.length > 0) {
    try {
      await ImageManager.deleteImagesByFilename(id, filenames);
    } catch (error) {
      console.error('Failed to delete pin images:', error);
      // Continue anyway
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
