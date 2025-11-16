import type { Form } from '~/db/types';
import { v4 as uuidv4 } from 'uuid';

export async function prepareFormForInsertion(form: Omit<Form, 'id'>): Promise<Form> {
  const formId = uuidv4();
  const timestamp = new Date().toISOString();

  const formWithDefaults: Form = {
    ...form,
    id: formId,
    createdAt: form.createdAt || timestamp,
    updatedAt: form.updatedAt || timestamp,
    version: form.version || 1,
    deletedAt: form.deletedAt || null,
    status: form.status || 'unsynced', // Default to unsynced for new forms
  };

  return formWithDefaults;
}
