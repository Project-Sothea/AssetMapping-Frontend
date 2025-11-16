import { createFormDb, updateFormDb, softDeleteFormDb, getFormById } from './formRepository';
import { prepareFormForInsertion } from './formProcessing';
import { enqueueForm } from '~/services/sync/queue';
import { updatePin } from '~/features/pins/services/PinService';
import { Form } from '~/db/types';

export async function createForm(values: Omit<Form, 'id'>): Promise<Form> {
  const prepared = await prepareFormForInsertion(values);
  await createFormDb(prepared);
  // touch parent pin so its updatedAt reflects new form activity
  if (prepared.pinId) {
    try {
      // Update the parent pin's updatedAt using updatePin so the repository
      // and sync queue logic runs consistently (this also enqueues the pin update).
      const updatedAt = new Date().toISOString();
      console.debug(`[FormService] createForm: updating pin ${prepared.pinId} updatedAt=${updatedAt} for new form ${prepared.id}`);
      await updatePin(prepared.pinId, { updatedAt });
    } catch (err) {
      console.warn(`[FormService] createForm: failed to update pin ${prepared.pinId} for form ${prepared.id}`, err);
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
      const updatedAt = new Date().toISOString();
      console.debug(`[FormService] updateForm: updating pin ${updated.pinId} updatedAt=${updatedAt} for form ${updated.id}`);
      await updatePin(updated.pinId, { updatedAt });
    } catch (err) {
      console.warn(`[FormService] updateForm: failed to update pin ${updated.pinId} for form ${updated.id}`, err);
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
