import { createPinDb, updatePinDb, softDeletePinDb, getPinById } from './pinRepository';
import { preparePinForInsertion, savePinImages, updatePinImages } from './pinProcessing';
import { enqueuePinCreate, enqueuePinUpdate, enqueuePinDelete } from '~/services/sync/queue';
import { Pin } from '~/db/types';

export async function createPin(pin: Omit<Pin, 'id'>): Promise<Pin> {
  const prepared = await preparePinForInsertion(pin);
  await createPinDb(prepared);
  await enqueuePinCreate(prepared);
  await savePinImages(prepared);
  return prepared;
}

export async function updatePin(id: string, updates: Partial<Pin>): Promise<Pin> {
  const existing = await getPinById(id);
  if (!existing) throw new Error(`Pin ${id} not found`);
  const updated = await updatePinImages(existing, updates);
  await updatePinDb(updated);
  await enqueuePinUpdate(id, updated);
  return updated;
}

export async function deletePin(id: string): Promise<void> {
  const existing = await getPinById(id);
  if (!existing) throw new Error(`Pin ${id} not found`);
  await softDeletePinDb(id);
  await enqueuePinDelete(id);
}
