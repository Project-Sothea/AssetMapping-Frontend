import { Pin, pins } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { LocalRepository } from '../LocalRepository';
import { eq } from 'drizzle-orm';

export class DrizzlePinRepo extends LocalRepository<Pin, typeof pins> {
  constructor() {
    super(db, pins, ['id', 'createdAt']);
  }

  transformOnFetch(row: Pin): Pin {
    return {
      ...row,
      images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images,
    };
  }

  transformBeforeInsert(item: Pin): Pin {
    return {
      ...item,
      images: Array.isArray(item.images) ? JSON.stringify(item.images) : (item.images ?? '[]'), // fallback to empty array
    };
  }

  async markAsSynced(items: (Partial<Pin> & { id: string })[]): Promise<void> {
    if (!items || items.length === 0) return;

    const now = new Date().toISOString();

    for (const item of items) {
      await this.db
        .update(pins)
        .set({
          status: 'synced',
          lastSyncedAt: now,
          failureReason: null,
          lastFailedSyncAt: null,
        })
        .where(eq(pins.id, item.id));
    }
  }
}
