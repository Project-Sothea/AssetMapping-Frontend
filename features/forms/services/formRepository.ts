import { db } from '~/services/drizzleDb';
import { forms } from '~/db/schema';
import type { FormDB } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeFormForDb } from '~/db/utils';

export async function createFormDb(form: FormDB): Promise<void> {
  await db.insert(forms).values(sanitizeFormForDb(form as any));
}

export async function updateFormDb(form: FormDB): Promise<FormDB> {
  const sanitized = sanitizeFormForDb(form as any);
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

export async function getFormById(id: string): Promise<FormDB | undefined> {
  const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
  return result[0];
}
