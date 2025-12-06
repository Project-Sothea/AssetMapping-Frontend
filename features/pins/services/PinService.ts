/**
 * PinService - Simple CRUD operations
 *
 * Key principles:
 * 1. Save pins to database immediately (optimistic)
 * 2. Queue for background sync to backend
 * 3. Images are just arrays of strings (no complex processing)
 * 4. Let the form/UI handle image picking and saving
 */

import { eq } from 'drizzle-orm';

import { pins } from '~/db/schema';
import { mapPinDbToPin, sanitizePinForDb } from '~/db/utils';
import { db } from '~/services/drizzleDb';
import * as ImageManager from '~/services/images/ImageManager';
import { enqueuePin } from '~/services/sync/queue/syncQueue';

import { Pin, PinUpdate, PinValues } from '..//types';

// ============================================
// CREATE
// ============================================

export async function createPin(pin: PinValues): Promise<Pin> {
  const newPin: Pin = {
    ...pin,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    status: 'unsynced',
  };

  await db.insert(pins).values(sanitizePinForDb(newPin));
  await enqueuePin('create', newPin);
  console.log('✅ Created pin:', newPin.id);

  return newPin;
}

// ============================================
// UPDATE
// ============================================

export async function updatePin(id: string, updates: PinUpdate): Promise<Pin> {
  const existing = await getPinById(id);
  if (!existing) {
    throw new Error(`Pin ${id} not found`);
  }

  const updated: Pin = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
    version: (existing.version || 1) + 1,
    status: 'unsynced',
  };

  await db.update(pins).set(sanitizePinForDb(updated)).where(eq(pins.id, id));
  await enqueuePin('update', updated);
  console.log('✅ Updated pin:', id);

  return updated;
}

// ============================================
// DELETE
// ============================================

export async function deletePin(id: string): Promise<void> {
  const existing = await getPinById(id);
  if (!existing) throw new Error(`Pin ${id} not found`);

  // Delete all local images when deleting the pin
  const filenames = existing.images || [];
  if (filenames.length > 0) {
    try {
      await ImageManager.deleteImagesByFilename(id, filenames);
      console.log('🗑️ Deleted pin images:', filenames.length);
    } catch (error) {
      console.error('Failed to delete pin images:', error);
      // Continue anyway
    }
  }

  await db.delete(pins).where(eq(pins.id, id));
  await enqueuePin('delete', { id });
  console.log('✅ Deleted pin:', id);
}

// ============================================
// READ
// ============================================

export async function getPinById(id: string): Promise<Pin | null> {
  const result = db.select().from(pins).where(eq(pins.id, id)).limit(1).get();
  return result ? mapPinDbToPin(result) : null;
}
