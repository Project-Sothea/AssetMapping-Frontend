import { createPinDb, updatePinDb, softDeletePinDb, getPinById } from './pinRepository';
import { preparePinForInsertion, savePinImages, updatePinImages } from './pinProcessing';
import { enqueuePin } from '~/services/sync/queue';
import type { Pin } from '~/db/types';

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

    return saved;
  } catch (error) {
    console.error('❌ Failed to update pin:', error);
    throw error;
  }
}

export async function deletePin(id: string): Promise<void> {
  const existing = await getPinById(id);
  if (!existing) throw new Error(`Pin ${id} not found`);
  await softDeletePinDb(id);
  await enqueuePin('delete', { id });
}
