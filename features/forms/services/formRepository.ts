import { db } from '~/services/drizzleDb';
import { forms, Form } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeForDb } from '~/db/utils';

export async function createFormDb(form: Form): Promise<void> {
  try {
    // Ensure required fields are present
    const timestamp = new Date().toISOString();
    const formWithDefaults = {
      ...form,
      createdAt: form.createdAt || timestamp,
      updatedAt: form.updatedAt || timestamp,
      version: form.version || 1,
      deletedAt: form.deletedAt || null,
    };

    // Sanitize and convert arrays to JSON strings
    const sanitized = sanitizeForDb(formWithDefaults);

    // Ensure array fields are properly serialized as JSON strings
    const arrayFields = [
      'longTermConditions',
      'managementMethods',
      'whatDoWhenSick',
      'cholesterolAction',
      'coldAction',
      'diarrhoeaAction',
      'mskAction',
      'hypertensionAction',
      'diabetesAction',
      'waterSources',
      'unsafeWater',
      'notUsingWaterFilter',
    ];

    for (const field of arrayFields) {
      if (field in sanitized) {
        const value = sanitized[field];
        if (Array.isArray(value)) {
          sanitized[field] = JSON.stringify(value);
        } else if (value === null || value === undefined || value === '') {
          sanitized[field] = '[]'; // Default to empty array JSON string
        }
      }
    }

    console.log('🔍 Creating form in DB:', {
      id: form.id?.slice(0, 8),
      arrayFieldsSample: {
        longTermConditions: sanitized.longTermConditions,
        waterSources: sanitized.waterSources,
      },
    });

    await db.insert(forms).values(sanitized);
    console.log('✅ Form created in DB');
  } catch (error: any) {
    console.error('❌ createFormDb error:', error);
    console.error('Error message:', error.message);
    throw error;
  }
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
