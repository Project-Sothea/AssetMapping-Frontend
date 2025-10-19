import { createFormDb, updateFormDb, softDeleteFormDb, getFormById } from './formRepository';
import { prepareFormForInsertion } from './formProcessing';
import { enqueueForm } from '~/services/sync/queue';
import { Form } from '~/db/schema';

export async function createForm(values: Omit<Form, 'id'>): Promise<Form> {
  const prepared = await prepareFormForInsertion(values);
  await createFormDb(prepared);
  await enqueueForm('create', prepared);
  return prepared;
}

export async function updateForm(id: string, values: Omit<Form, 'id'>): Promise<Form> {
  const existing = await getFormById(id);
  if (!existing) throw new Error(`Form ${id} not found`);
  await updateFormDb(existing);
  await enqueueForm('update', values);
  return existing;
}

export async function deleteForm(id: string): Promise<void> {
  const existing = await getFormById(id);
  if (!existing) throw new Error(`Form ${id} not found`);
  await softDeleteFormDb(id);
  await enqueueForm('delete', { id });
}
