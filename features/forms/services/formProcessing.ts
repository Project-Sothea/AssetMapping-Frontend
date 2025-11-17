import type { FormDB } from '~/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function prepareFormForInsertion(form: Omit<FormDB, 'id'>): Promise<FormDB> {
  const formId = uuidv4();
  const timestamp = new Date().toISOString();

  const formWithDefaults: FormDB = {
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
