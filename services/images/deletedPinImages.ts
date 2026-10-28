import { and, eq, inArray } from 'drizzle-orm';

import { pins, syncInflight, syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { deletePinImageDirectory } from '~/services/images/ImageManager';

/** Keep every revision's photos until cancellation or a confirmed server deletion. */
export async function cleanupDeletedPinImages(pinId: string): Promise<void> {
  try {
    if (db.select({ id: pins.id }).from(pins).where(eq(pins.id, pinId)).get()) return;
    if (
      db
        .select({ id: syncQueue.id })
        .from(syncQueue)
        .where(
          and(
            eq(syncQueue.entityType, 'pin'),
            eq(syncQueue.entityId, pinId),
            inArray(syncQueue.status, ['pending', 'failed'])
          )
        )
        .get()
    )
      return;
    if (
      db
        .select({ key: syncInflight.key })
        .from(syncInflight)
        .where(and(eq(syncInflight.entityType, 'pin'), eq(syncInflight.entityId, pinId)))
        .get()
    )
      return;
    await deletePinImageDirectory(pinId);
  } catch {
    // File cleanup must never undo an acknowledged deletion or remove replay state.
    console.warn('Deleted pin photos could not be cleaned from this device.');
  }
}

/** Recover cleanup if the app stopped after its acknowledgement transaction. */
export async function cleanupCompletedPinImages(): Promise<void> {
  const completed = db
    .selectDistinct({ id: syncQueue.entityId })
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.entityType, 'pin'),
        eq(syncQueue.operation, 'delete'),
        eq(syncQueue.status, 'completed')
      )
    )
    .all();
  for (const pin of completed) await cleanupDeletedPinImages(pin.id);
}
