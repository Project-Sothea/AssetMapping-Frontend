import { createFormDb, updateFormDb, softDeleteFormDb, getFormById } from './formRepository';
import { prepareFormForInsertion } from './formProcessing';
import { enqueueForm } from '~/services/sync/queue';
import { touchPin } from '~/features/pins/services/PinService';
import { Form } from '~/db/schema';

export async function createForm(values: Omit<Form, 'id'>): Promise<Form> {
  const prepared = await prepareFormForInsertion(values);
  await createFormDb(prepared);
  // touch parent pin so its updatedAt reflects new form activity
  if (prepared.pinId) {
    try {
      // touchPin sets the local device time immediately (so UI updates while offline)
      // The updatedAt value will be synced/reconciled with the server when the
      // queued sync operation completes.
      await touchPin(prepared.pinId);
    } catch (err) {
      console.warn('Failed to touch pin after form create', err);
    }
  }
  await enqueueForm('create', prepared);
  return prepared;
}

export async function updateForm(id: string, values: Omit<Form, 'id'>): Promise<Form> {
  console.log('before: ');
  const existing = await getFormById(id);
  if (!existing) throw new Error(`Form ${id} not found`);

  // Merge existing form with new values
  const mergedForm = {
    ...existing,
    ...values,
    id, // Ensure ID doesn't change
    updatedAt: new Date().toISOString(), // Update timestamp
  };

  const updated = await updateFormDb(mergedForm);
  console.log('new form data:', updated);
  // touch parent pin so its updatedAt reflects updated form activity
  if (updated.pinId) {
    try {
      // touchPin sets the local device time immediately (so UI updates while offline)
      // The updatedAt value will be synced/reconciled with the server when the
      // queued sync operation completes.
      await touchPin(updated.pinId);
    } catch (err) {
      console.warn('Failed to touch pin after form update', err);
    }
  }
  await enqueueForm('update', updated);
  return updated; // Return the updated form data
}

export async function deleteForm(id: string): Promise<void> {
  const existing = await getFormById(id);
  if (!existing) throw new Error(`Form ${id} not found`);
  await softDeleteFormDb(id);
  await enqueueForm('delete', { id });
}
