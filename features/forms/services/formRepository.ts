import { db } from '~/services/drizzleDb';
import { forms, Form } from '~/db/schema';
import { eq } from 'drizzle-orm';

export async function createFormDb(form: Form): Promise<void> {
  await db.insert(forms).values(form);
}

export async function updateFormDb(form: Form): Promise<void> {
  await db.update(forms).set(form).where(eq(forms.id, form.id));
}

export async function softDeleteFormDb(id: string): Promise<void> {
  await db.update(forms).set({ deletedAt: new Date().toISOString() }).where(eq(forms.id, id));
}

export async function getFormById(id: string): Promise<Form | undefined> {
  const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return result[0];
}
