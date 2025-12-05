/**
 * PinService - Simple CRUD operations
 *
 * Key principles:
 * 1. Save pins to database immediately (optimistic)
 * 2. Queue for background sync to backend
 * 3. Images are just arrays of strings (no complex processing)
 * 4. Let the form/UI handle image picking and saving
 */

import { db } from '~/services/drizzleDb';
import { pins, type Pin } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { enqueuePin } from '~/services/sync/queue/syncQueue';
import * as ImageManager from '~/services/images/ImageManager';
import { mapPinDbToPin, sanitizePinForDb } from '~/db/utils';

// ============================================
// CREATE
// ============================================

export async function createPin(pin: Pin): Promise<Pin> {
  await db.insert(pins).values(sanitizePinForDb(pin));
  await enqueuePin('create', pin);
  console.log('✅ Created pin:', pin.id);

  return pin;
}

// ============================================
// UPDATE
// ============================================

export async function updatePin(id: string, updates: Partial<Pin>): Promise<Pin> {
  const existing = await getPinById(id);
  if (!existing) {
    throw new Error(`Pin ${id} not found`);
  }

  const updated: Pin = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
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
  const result = await db.select().from(pins).where(eq(pins.id, id)).limit(1);
  return result[0] ? mapPinDbToPin(result[0]) : null;
}
