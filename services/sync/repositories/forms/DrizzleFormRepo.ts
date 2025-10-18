import { Form, forms } from '~/db/schema';
import { db } from '~/services/drizzleDb';
import { LocalRepository } from '../LocalRepository';
import { stringifyArrayFields } from '~/db/utils';
import { eq } from 'drizzle-orm';

export class DrizzleFormRepo extends LocalRepository<Form, typeof forms> {
  constructor() {
    super(db, forms, ['id', 'createdAt']);
  }

  transformOnFetch(row: Form): Form {
    return row; // no special handling needed
  }

  transformBeforeInsert(item: Form): Form {
    return stringifyArrayFields(item); // no special handling needed
  }

  async update(item: Partial<Form> & { id: string }): Promise<void> {
    const { id, ...rest } = item as any;
    const transformed = this.transformBeforeInsert(rest as Form);
    await this.db
      .update(forms)
      .set(transformed as any)
      .where(eq(forms.id, id));
  }

  async markAsSynced(items: (Partial<Form> & { id: string })[]): Promise<void> {
    if (!items || items.length === 0) return;

    const now = new Date().toISOString();

    for (const item of items) {
      await this.db
        .update(forms)
        .set({
          status: 'synced',
          lastSyncedAt: now,
          failureReason: null,
          lastFailedSyncAt: null,
        })
        .where(eq(forms.id, item.id));
    }
  }
}
