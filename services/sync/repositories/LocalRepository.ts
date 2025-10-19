import { db as defaultDb, buildUpsertSet } from '~/services/drizzleDb';
import { eq } from 'drizzle-orm';

export class LocalRepository<T = any, Table = any> {
  protected db: any;
  constructor(
    dbInstance: any = defaultDb,
    protected table: Table,
    protected excludedCols: (keyof Table)[] = []
  ) {
    this.db = dbInstance;
  }

  protected transformOnFetch(row: any): T {
    return row as T;
  }

  protected transformBeforeInsert(item: Partial<T>): Partial<T> {
    return item;
  }

  async fetchAll(): Promise<T[]> {
    const rows: any[] = await this.db.select().from(this.table);
    return rows.map((r) => this.transformOnFetch(r));
  }

  async upsertAll(items: Partial<T>[]): Promise<void> {
    if (!items || items.length === 0) return;

    // naive upsert: try insert, fallback to update when conflict occurs
    for (const item of items) {
      if (!('id' in item)) continue;
      const id = (item as any).id;
      const exists = await this.exists(id);
      let payload = this.transformBeforeInsert(item as Partial<T>);

      // Preserve local-only fields when updating from remote
      if (exists) {
        const existing: any = await this.db
          .select()
          .from(this.table)
          .where(eq((this.table as any).id, id))
          .limit(1)
          .then((rows: any[]) => rows[0]);

        // Preserve localImages field if it exists in local but not in remote payload
        if (existing?.localImages && !(payload as any).localImages) {
          payload = { ...payload, localImages: existing.localImages };
        }
      }

      try {
        if (!exists) {
          await this.db.insert(this.table).values(payload as any);
        } else {
          await this.db
            .update(this.table)
            .set(payload as any)
            .where(eq((this.table as any).id, id));
        }
      } catch {
        // Last resort: try conflict upsert using buildUpsertSet if available
        try {
          const set = buildUpsertSet(this.table as any, this.excludedCols as any);
          await this.db
            .insert(this.table)
            .values(payload as any)
            .onConflictDoUpdate({ target: [(this.table as any).id], set });
        } catch {
          console.warn('LocalRepository upsert failed for id', id);
        }
      }
    }
  }

  async updateFieldsBatch(updates: { id: string; fields: Record<string, any> }[]): Promise<void> {
    if (!updates || updates.length === 0) return;
    for (const u of updates) {
      await this.db
        .update(this.table)
        .set(u.fields)
        .where(eq((this.table as any).id, u.id));
    }
  }

  async markAsSynced(items: (Partial<T> & { id: string })[]): Promise<void> {
    // noop default; subclasses may override to set synced flags
    return;
  }

  // convenience CRUD used by app
  async create(item: Partial<T>): Promise<void> {
    const payload = this.transformBeforeInsert(item);
    await this.db.insert(this.table).values(payload as any);
  }

  async get(id: string): Promise<T | null> {
    const rows: any[] = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id));
    if (!rows || rows.length === 0) return null;
    return this.transformOnFetch(rows[0]);
  }

  async update(item: Partial<T> & { id: string }): Promise<void> {
    const { id, ...rest } = item as any;
    await this.db
      .update(this.table)
      .set(rest)
      .where(eq((this.table as any).id, id));
  }

  async delete(id: string): Promise<void> {
    // hard delete by default
    await this.db.delete(this.table).where(eq((this.table as any).id, id));
  }

  async exists(id: string): Promise<boolean> {
    const rows: any[] = await this.db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id));
    return rows && rows.length > 0;
  }
}

export default LocalRepository;
