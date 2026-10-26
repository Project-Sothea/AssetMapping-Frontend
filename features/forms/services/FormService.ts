import type { Form } from '@assetmapping/shared-types';
import { eq } from 'drizzle-orm';
import { v4 } from 'uuid';

import { forms, pins } from '~/db/schema';
import { mapFormDbToForm, mapPinDbToPin, sanitizeFormForDb, sanitizePinForDb } from '~/db/utils';
import { validateLocal } from '~/db/validateLocal';
import { db } from '~/services/drizzleDb';
import { enqueueInTransaction } from '~/services/sync/queue/queueOperations';
import { scheduleNextProcess } from '~/services/sync/queue/queueState';
import { processQueue } from '~/services/sync/queue/syncQueue';
import { assertLocalWritesAllowed } from '~/services/sync/transferCoordinator';
import { sameContent } from '~/shared/utils/sameContent';

import type { FormUpdate, FormValues } from '../types';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function touchParent(tx: Transaction, pinId: string, updatedAt: Date) {
  const row = tx.select().from(pins).where(eq(pins.id, pinId)).get();
  if (!row) throw new Error('The household pin is missing. Reopen the pin before saving.');
  const pin = { ...mapPinDbToPin(row), updatedAt, status: 'unsynced' };
  tx.update(pins).set(sanitizePinForDb(pin)).where(eq(pins.id, pinId)).run();
  enqueueInTransaction(tx, {
    operation: 'update',
    entityType: 'pin',
    entityId: pinId,
    payload: pin,
  });
}

export async function createForm(values: FormValues): Promise<Form> {
  assertLocalWritesAllowed();
  if (typeof values.pinId !== 'string' || !values.pinId.trim())
    throw new Error('Please reopen the pin before saving this form.');
  const now = new Date();
  const form: Form = {
    ...values,
    id: v4(),
    createdAt: now,
    updatedAt: now,
    version: 1,
    status: 'unsynced',
  };
  validateLocal('form', form);
  db.transaction((tx) => {
    touchParent(tx, form.pinId, now);
    tx.insert(forms).values(sanitizeFormForDb(form)).run();
    enqueueInTransaction(tx, {
      operation: 'create',
      entityType: 'form',
      entityId: form.id,
      payload: form,
    });
  });
  scheduleNextProcess(processQueue);
  return form;
}

export async function updateForm(id: string, updates: FormUpdate, baseline?: Form): Promise<Form> {
  assertLocalWritesAllowed();
  const form = db.transaction((tx) => {
    const existing = tx.select().from(forms).where(eq(forms.id, id)).get();
    if (!existing) throw new Error('This form no longer exists on this device.');
    if (baseline && !sameContent(mapFormDbToForm(existing), baseline))
      throw new Error(
        'This form changed while you were editing. Your draft is still open; review the latest saved answers before trying again.'
      );
    const updated: Form = {
      ...mapFormDbToForm(existing),
      ...updates,
      id,
      pinId: existing.pinId,
      createdAt: existing.createdAt,
      version: existing.version,
      updatedAt: new Date(),
      status: 'unsynced',
    };
    validateLocal('form', updated);
    touchParent(tx, updated.pinId, updated.updatedAt!);
    tx.update(forms).set(sanitizeFormForDb(updated)).where(eq(forms.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'update',
      entityType: 'form',
      entityId: id,
      payload: updated,
    });
    return updated;
  });
  scheduleNextProcess(processQueue);
  return form;
}

export async function deleteForm(id: string, baseline?: Form): Promise<void> {
  assertLocalWritesAllowed();
  db.transaction((tx) => {
    const existing = tx.select().from(forms).where(eq(forms.id, id)).get();
    if (!existing) throw new Error('This form no longer exists on this device.');
    const form = mapFormDbToForm(existing);
    if (baseline && !sameContent(form, baseline))
      throw new Error(
        'This form changed since you opened it. Review its saved answers before deleting.'
      );
    touchParent(tx, form.pinId, new Date());
    tx.delete(forms).where(eq(forms.id, id)).run();
    enqueueInTransaction(tx, {
      operation: 'delete',
      entityType: 'form',
      entityId: id,
      payload: form,
    });
  });
  scheduleNextProcess(processQueue);
}

export async function getFormById(id: string): Promise<Form | null> {
  const result = db.select().from(forms).where(eq(forms.id, id)).get();
  return result ? mapFormDbToForm(result) : null;
}
