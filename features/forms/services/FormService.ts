import type { Form } from '@assetmapping/shared-types';
import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';

import { forms, pins } from '~/db/schema';
import {
  mapFormDbToForm,
  mapPinDbToPin,
  sanitizeFormForDb,
  sanitizePinForDb,
  formWriteValues,
} from '~/db/utils';
import { db } from '~/services/drizzleDb';
import { enqueueInTransaction, LocalTransaction } from '~/services/sync/queue/queueOperations';
import { assertLocalWritesAllowed } from '~/services/sync/transferCoordinator';

import type { FormUpdate, FormValues } from '../types';

function touchParent(tx: LocalTransaction, pinId: string, requireVillage = false) {
  if (typeof pinId !== 'string' || !pinId.trim()) {
    throw new Error('Please reopen the pin before saving this form. The pin link is missing.');
  }
  const parent = tx.select().from(pins).where(eq(pins.id, pinId)).get();
  if (!parent) throw new Error('The parent pin is missing. Save the pin before saving a form.');
  if (requireVillage && !parent.cityVillage?.trim()) {
    throw new Error('Choose a village on the pin before adding a form.');
  }
  const updated = { ...mapPinDbToPin(parent), updatedAt: new Date(), status: 'unsynced' };
  tx.update(pins).set(sanitizePinForDb(updated)).where(eq(pins.id, pinId)).run();
  enqueueInTransaction(tx, {
    operation: 'update',
    entityType: 'pin',
    entityId: pinId,
    payload: updated,
  });
}
export async function createForm(values: FormValues): Promise<Form> {
  assertLocalWritesAllowed();
  const form: Form = {
    ...formWriteValues(values),
    id: v4(),
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    status: 'unsynced',
  };
  db.transaction((tx) => {
    touchParent(tx, form.pinId, true);
    tx.insert(forms).values(sanitizeFormForDb(form)).run();
    enqueueInTransaction(tx, {
      operation: 'create',
      entityType: 'form',
      entityId: form.id,
      payload: form,
    });
  });
  return form;
}
export async function updateForm(id: string, updates: FormUpdate): Promise<Form> {
  assertLocalWritesAllowed();
  const row = db.select().from(forms).where(eq(forms.id, id)).get();
  if (!row) throw new Error(`Form ${id} not found`);
  const updated: Form = {
    ...mapFormDbToForm(row),
    ...formWriteValues(updates),
    updatedAt: new Date(),
    status: 'unsynced',
  };
  db.transaction((tx) => {
    touchParent(tx, updated.pinId, updated.pinId !== row.pinId);
    tx.update(forms).set(sanitizeFormForDb(updated)).where(eq(forms.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'update',
      entityType: 'form',
      entityId: id,
      payload: updated,
    });
  });
  return updated;
}
export async function deleteForm(id: string): Promise<void> {
  assertLocalWritesAllowed();
  const row = db.select().from(forms).where(eq(forms.id, id)).get();
  if (!row) throw new Error(`Form ${id} not found`);
  const form = mapFormDbToForm(row);
  db.transaction((tx) => {
    touchParent(tx, form.pinId);
    tx.delete(forms).where(eq(forms.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'delete',
      entityType: 'form',
      entityId: id,
      payload: form,
    });
  });
}
export async function getFormById(id: string): Promise<Form | null> {
  const result = db.select().from(forms).where(eq(forms.id, id)).get();
  return result ? mapFormDbToForm(result) : null;
}
