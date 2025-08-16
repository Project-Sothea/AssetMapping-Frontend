import { inArray, eq } from 'drizzle-orm';
import { buildUpsertSet, buildSoftDeleteSet } from '~/services/drizzleDb';
import { v4 as uuidv4 } from 'uuid';

export abstract class LocalRepository<T extends { id: string }, Table extends Record<string, any>> {
  constructor(
    protected readonly db: any,
    protected readonly table: Table,
    protected readonly excludeUpsert: (keyof Table)[]
  ) {}

  abstract transformOnFetch(row: T): T; // override for special cases
  abstract transformBeforeInsert(item: T): T; // override if needed

  async getDirty(): Promise<T[]> {
    const rows = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).status, 'dirty'));
    return rows.map((r: T) => this.transformOnFetch(r));
  }

  async upsertAll(items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    const now = new Date().toISOString();

    await this.db
      .insert(this.table)
      .values(items.map((i) => this.transformBeforeInsert(i)))
      .onConflictDoUpdate({
        target: (this.table as any).id,
        set: buildUpsertSet<Table>(this.table, this.excludeUpsert, {
          updatedAt: now,
          status: 'synced',
          lastSyncedAt: now,
        } as Partial<Record<keyof Table, any>>),
      });
  }

  async markAsSynced(items: T[]): Promise<void> {
    const ids = items.map((i) => i.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();

    await this.db
      .update(this.table)
      .set({
        lastSyncedAt: now,
        updatedAt: now,
        status: 'synced',
        lastFailedSyncAt: null,
        failureReason: null,
      })
      .where(inArray((this.table as any).id, ids));
  }

  async fetchAll(): Promise<T[]> {
    const rows = await this.db.select().from(this.table);
    return rows.map((r: T) => this.transformOnFetch(r));
  }

  async get(id: string): Promise<T> {
    const row = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1)
      .then((rows: T[]) => rows[0] || null);
    return this.transformOnFetch(row);
  }

  async create(item: T): Promise<void> {
    const now = new Date().toISOString();
    const localCreate = {
      ...this.transformBeforeInsert(item),
      id: uuidv4(),
      status: 'dirty',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      lastFailedSyncAt: null,
      failureReason: null,
    };
    console.log('db insert', localCreate);
    await this.db.insert(this.table).values(localCreate);
  }

  async update(item: T): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(this.table)
      .set({
        ...this.transformBeforeInsert(item),
        updatedAt: now,
      })
      .where(eq((this.table as any).id, item.id));
  }

  async upsert(item: T): Promise<void> {
    const now = new Date().toISOString();
    const localCreate = {
      ...this.transformBeforeInsert(item),
      id: uuidv4(),
      status: 'dirty',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      lastFailedSyncAt: null,
      failureReason: null,
    };

    await this.db
      .insert(this.table)
      .values(localCreate)
      .onConflictDoUpdate({
        target: (this.table as any).id,
        set: {
          ...this.transformBeforeInsert(item),
          updatedAt: now,
        },
      });
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(this.table)
      .set(
        buildSoftDeleteSet(this.table, ['id', 'createdAt', 'updatedAt', 'deletedAt'], {
          updatedAt: now,
          deletedAt: now,
          status: 'dirty',
        } as Partial<Record<keyof Table, any>>)
      )
      .where(eq((this.table as any).id, id));
  }

  async updateFieldsBatch(updates: { id: string; fields: Partial<T> }[]): Promise<void> {
    for (const update of updates) {
      await this.db
        .update(this.table)
        .set(update.fields)
        .where(eq((this.table as any).id, update.id));
    }
  }
}
