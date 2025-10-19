import { db } from '~/services/drizzleDb';
import { pins } from '~/db/schema';
import { Pin } from '~/db/types';
import { sanitizePinForDb } from '~/db/utils';
import { eq } from 'drizzle-orm';

export async function createPinDb(pin: Pin): Promise<void> {
  await db.insert(pins).values(sanitizePinForDb(pin));
}

export async function updatePinDb(pin: Pin): Promise<void> {
  await db.update(pins).set(sanitizePinForDb(pin)).where(eq(pins.id, pin.id));
}

export async function getPinById(id: string): Promise<Pin | null> {
  const result = await db.select().from(pins).where(eq(pins.id, id)).limit(1);
  return result[0] ?? null;
}

export async function softDeletePinDb(id: string): Promise<void> {
  await db.update(pins).set({ deletedAt: new Date().toISOString() }).where(eq(pins.id, id));
}
