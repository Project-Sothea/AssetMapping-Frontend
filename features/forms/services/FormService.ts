import type { Form } from '@assetmapping/shared-types';
import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';

import { forms } from '~/db/schema';
import { mapFormDbToForm, sanitizeFormForDb } from '~/db/utils';
import { updatePin } from '~/features/pins/services/PinService';
import { db } from '~/services/drizzleDb';
import { enqueueForm } from '~/services/sync/queue/syncQueue';

import type { FormUpdate, FormValues } from '../types';

// ============================================
// CREATE
// ============================================

export async function createForm(values: FormValues): Promise<Form> {
  const newForm: Form = {
    ...values,
    id: v4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    status: 'unsynced',
  };
  await db.insert(forms).values(sanitizeFormForDb(newForm));
  // touch parent pin so its updatedAt reflects new form activity
  if (newForm.pinId) {
    try {
      // Update the parent pin's updatedAt using updatePin so the repository
      // and sync queue logic runs consistently (this also enqueues the pin update).
      const updatedAt = new Date();
      console.debug(
        `[FormService] createForm: updating pin ${newForm.pinId} updatedAt=${updatedAt} for new form ${newForm.id}`
      );
      await updatePin(newForm.pinId, { updatedAt });
    } catch (err) {
      console.warn(
        `[FormService] createForm: failed to update pin ${newForm.pinId} for form ${newForm.id}`,
        err
      );
    }
  }
  await enqueueForm('create', newForm);
  return newForm;
}

// ============================================
// UPDATE
// ============================================

export async function updateForm(id: string, updates: FormUpdate): Promise<Form> {
  const existing = await getFormById(id);
  if (!existing) throw new Error(`Form ${id} not found`);

  // Merge existing form with new values
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date(), // Update timestamp
    status: 'unsynced', // Mark as unsynced
  };

  await db.update(forms).set(sanitizeFormForDb(updated)).where(eq(forms.id, id));
  // touch parent pin so its updatedAt reflects updated form activity
  if (updated.pinId) {
    try {
      const updatedAt = new Date();
      console.debug(
        `[FormService] updateForm: updating pin ${updated.pinId} updatedAt=${updatedAt} for form ${updated.id}`
      );
      await updatePin(updated.pinId, { updatedAt });
    } catch (err) {
      console.warn(
        `[FormService] updateForm: failed to update pin ${updated.pinId} for form ${updated.id}`,
        err
      );
    }
  }
  await enqueueForm('update', updated);
  return updated; // Return the updated form data
}

// ============================================
// DELETE
// ============================================

export async function deleteForm(id: string): Promise<void> {
  const existing = await getFormById(id);
  if (!existing) throw new Error(`Form ${id} not found`);
  await db.delete(forms).where(eq(forms.id, id));
  // touch parent pin so its updatedAt reflects deleted form activity
  if (existing.pinId) {
    try {
      const updatedAt = new Date();
      console.debug(
        `[FormService] deleteForm: updating pin ${existing.pinId} updatedAt=${updatedAt} for deleted form ${existing.id}`
      );
      await updatePin(existing.pinId, { updatedAt });
    } catch (err) {
      console.warn(
        `[FormService] deleteForm: failed to update pin ${existing.pinId} for deleted form ${existing.id}`,
        err
      );
    }
  }
  await enqueueForm('delete', { id });
}

// ============================================
// READ
// ============================================

export async function getFormById(id: string): Promise<Form | null> {
  const result = db.select().from(forms).where(eq(forms.id, id)).limit(1).get();
  return result ? mapFormDbToForm(result) : null;
}
