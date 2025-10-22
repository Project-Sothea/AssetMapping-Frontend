import { createPinDb, updatePinDb, softDeletePinDb, getPinById } from './pinRepository';
import { preparePinForInsertion, savePinImages, updatePinImages } from './pinProcessing';
import { enqueuePin } from '~/services/sync/queue';
import { Pin } from '~/db/types';

export async function createPin(pin: Omit<Pin, 'id'>): Promise<Pin> {
  const prepared = await preparePinForInsertion(pin);
  await createPinDb(prepared);
  await enqueuePin('create', prepared);
  await savePinImages(prepared);
  return prepared;
}

export async function updatePin(id: string, updates: Partial<Pin>): Promise<Pin> {
  try {
    const existing = await getPinById(id);
    if (!existing) {
      throw new Error(`Pin ${id} not found`);
    }

    // Process image updates (handles add/remove/keep)
    const updated = await updatePinImages(existing, updates);

    // Save to local database
    const saved = await updatePinDb(updated);

    // Queue for background sync to backend
    await enqueuePin('update', saved);

    return updated;
  } catch (error) {
    console.error('❌ Failed to update pin:', error);
    throw error;
  }
}

/**
 * Update only the updatedAt timestamp on a pin (touch)
 *
 * NOTE: This sets the local device time (new Date().toISOString()) immediately so
 * the UI can reflect recent activity while offline. The timestamp will be synced
 * to the server when the queued sync operation runs; if you require server-authoritative
 * timestamps, update the timestamp to the server value after a successful sync.
 */
export async function touchPin(id: string): Promise<void> {
  try {
    console.debug(`[PinService] touchPin: attempting to touch pin ${id}`);
    const existing = await getPinById(id);
    if (!existing) {
      throw new Error(`Pin ${id} not found`);
    }

    const updatedAt = new Date().toISOString();
    const updated = await updatePinDb({ ...existing, updatedAt });
    console.debug(`[PinService] touchPin: updated pin ${id} updatedAt=${updatedAt}`, updated);
    return;
  } catch (err) {
    // Surface helpful diagnostic info but don't crash the caller
    console.warn(`[PinService] touchPin: failed to touch pin ${id}`, err);
    throw err;
  }
}

export async function deletePin(id: string): Promise<void> {
  const existing = await getPinById(id);
  if (!existing) throw new Error(`Pin ${id} not found`);
  await softDeletePinDb(id);
  await enqueuePin('delete', { id });
}
