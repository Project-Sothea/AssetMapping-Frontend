import { db } from '~/services/drizzleDb';
import { forms, Form } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeFormForDb } from '~/db/utils';

export async function createFormDb(form: Form): Promise<void> {
  await db.insert(forms).values(sanitizeFormForDb(form));
}

export async function updateFormDb(form: Form): Promise<Form> {
  const sanitized = sanitizeFormForDb(form);
  console.log('Sanitized form before DB update:', sanitized);

  const result = await db.update(forms).set(sanitized).where(eq(forms.id, form.id)).returning();

  if (result.length === 0) {
    throw new Error(`Form with id ${form.id} not found`);
  }
  console.log(result[0].village);

  return result[0];
}

export async function softDeleteFormDb(id: string): Promise<void> {
  await db.update(forms).set({ deletedAt: new Date().toISOString() }).where(eq(forms.id, id));
}

export async function getFormById(id: string): Promise<Form | undefined> {
  const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return result[0];
}
