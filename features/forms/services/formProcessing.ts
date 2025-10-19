import { Form } from '~/db/types';
import { v4 as uuidv4 } from 'uuid';

export async function prepareFormForInsertion(form: Omit<Form, 'id'>): Promise<Form> {
  const formId = uuidv4();
  const formWithId = { ...form, id: formId };
  return formWithId;
}
