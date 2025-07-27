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

  public async upsertFromRemote(items: Pin[]) {
    const now = new Date().toISOString();
    const pins = items.map((item) => ({
      ...item,
      status: 'synced',
      lastSyncedAt: now,
    }));
    await this.upsertAll(pins);
  }

  async upsertAll(items: Pin[]): Promise<void> {
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
        },
      });

    return;
  }

  async markAsSynced(items: Pin[]): Promise<void> {
    const ids = items.map((pin) => pin.id);
    if (ids.length === 0) return;

    const now = new Date().toISOString();

    await db.update(pins).set({ lastSyncedAt: now }).where(inArray(pins.id, ids));
  }
}
