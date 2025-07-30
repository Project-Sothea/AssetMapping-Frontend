import { Pin, pins } from '~/db/schema';
import LocalRepository from '../interfaces/LocalRepository';
import { buildConflictUpdateColumns, db } from '~/services/drizzleDb';
import { inArray, eq } from 'drizzle-orm';

export class DrizzlePinRepo implements LocalRepository<Pin> {
  async getDirty(): Promise<Pin[]> {
    const rows = await db.select().from(pins).where(eq(pins.status, 'dirty'));
    return rows.map((row) => ({
      ...row,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
    }));
  }

  //upserts data (in Pin format) into local db from a remote source
  async upsertAll(items: Pin[]): Promise<void> {
    if (!items || items.length === 0) return;
    const now = new Date().toISOString();

    await db
      .insert(pins)
      .values(items)
      .onConflictDoUpdate({
        target: pins.id,
        set: {
          ...buildConflictUpdateColumns(pins, [
            'name',
            'lat',
            'lng',
            'type',
            'images',
            'localImages',
            'country',
            'postalCode',
            'address',
            'stateProvince',
            'description',
            'failureReason',
            'lastSyncedAt',
            'lastFailedSyncAt',
            'updatedAt',
            'deletedAt',
            'createdAt',
            'status',
          ]),
          updatedAt: now,
          status: 'synced',
          lastSyncedAt: now,
        },
      });

    return;
  }

  async markAsSynced(items: Pin[]): Promise<void> {
    const ids = items.map((pin) => pin.id);
    if (ids.length === 0) return;

    const now = new Date().toISOString();

    await db
      .update(pins)
      .set({
        lastSyncedAt: now,
        updatedAt: now,
        status: 'synced',
        lastFailedSyncAt: null,
        failureReason: null, // clear any previous error
      })
      .where(inArray(pins.id, ids));
  }

  async fetchAll(): Promise<Pin[]> {
    const localData = await db.select().from(pins);
    return localData;
  }

  async get(id: string): Promise<Pin> {
    const pin = await db
      .select()
      .from(pins)
      .where(eq(pins.id, id))
      .limit(1)
      .then((rows) => rows[0] || null);

    return pin;
  }
  async create(item: Pin): Promise<void> {
    await db.insert(pins).values(item);
  }

  async update(pin: Pin): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(pins)
      .set({
        ...pin,
        updatedAt: now,
      })
      .where(eq(pins.id, pin.id));
  }

  async upsert(pin: Pin): Promise<void> {
    const now = new Date().toISOString();
    try {
      await db
        .insert(pins)
        .values(pin)
        .onConflictDoUpdate({
          target: pins.id,
          set: {
            ...pin,
            updatedAt: now,
          },
        });
    } catch (e) {
      console.warn(e);
    }
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(pins)
      .set({
        name: null,
        lat: null,
        lng: null,
        type: null,
        address: null,
        description: null,
        updatedAt: now,
        deletedAt: now,
        status: 'dirty',
        images: null,
        localImages: null,
      })
      .where(eq(pins.id, id));
  }

  async updateFieldsBatch(updates: { id: string; fields: Partial<Pin> }[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx.update(pins).set(update.fields).where(eq(pins.id, update.id));
      }
    });
  }
}
