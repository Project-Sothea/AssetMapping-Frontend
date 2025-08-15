import { Form, forms } from '~/db/schema';
import LocalRepository from '../../interfaces/LocalRepository';
import { db } from '~/services/drizzleDb';
import { inArray, eq } from 'drizzle-orm';

function buildUpsertSet<T extends Record<string, any>>(
  table: T,
  exclude: (keyof T)[],
  systemOverrides: Partial<Record<keyof T, any>> = {}
) {
  const cols = Object.keys(table).filter((col) => !exclude.includes(col as keyof T));

  const set: Record<string, any> = {};
  for (const col of cols) {
    set[col] = (table as any)[col];
  }

  return {
    ...set,
    ...systemOverrides,
  };
}

function buildSoftDeleteSet<T extends Record<string, any>>(
  table: T,
  exclude: (keyof T)[],
  systemOverrides: Partial<Record<keyof T, any>> = {}
) {
  const set: Record<string, any> = {};

  for (const col of Object.keys(table)) {
    if (exclude.includes(col as keyof T)) continue;
    set[col] = null; // default nullify
  }

  return {
    ...set,
    ...systemOverrides,
  };
}

export class DrizzleFormRepo implements LocalRepository<Form> {
  async getDirty(): Promise<Form[]> {
    const rows = await db.select().from(forms).where(eq(forms.status, 'dirty'));
    return rows;
  }
  async upsertAll(items: Form[]): Promise<void> {
    if (!items || items.length === 0) return;
    const now = new Date().toISOString();

    await db
      .insert(forms)
      .values(items)
      .onConflictDoUpdate({
        target: forms.id,
        set: buildUpsertSet(forms, ['id', 'createdAt'], {
          updatedAt: now,
          status: 'synced',
          lastSyncedAt: now,
        }),
      });

    return;
  }

  async markAsSynced(items: Form[]): Promise<void> {
    const ids = items.map((forms) => forms.id);
    if (ids.length === 0) return;

    const now = new Date().toISOString();

    await db
      .update(forms)
      .set({
        lastSyncedAt: now,
        updatedAt: now,
        status: 'synced',
        lastFailedSyncAt: null,
        failureReason: null, // clear any previous error
      })
      .where(inArray(forms.id, ids));
  }
  async fetchAll(): Promise<Form[]> {
    const localData = await db.select().from(forms);
    return localData;
  }
  async get(id: string): Promise<Form> {
    const pin = await db
      .select()
      .from(forms)
      .where(eq(forms.id, id))
      .limit(1)
      .then((rows) => rows[0] || null);

    return pin;
  }
  async create(item: Form): Promise<void> {
    await db.insert(forms).values(item);
  }

  async update(item: Form): Promise<void> {
    const now = new Date().toISOString();
    await db
      .update(forms)
      .set({
        ...item,
        updatedAt: now,
      })
      .where(eq(forms.id, item.id));
  }

  async upsert(item: Form): Promise<void> {
    const now = new Date().toISOString();
    try {
      await db
        .insert(forms)
        .values(item)
        .onConflictDoUpdate({
          target: forms.id,
          set: {
            ...item,
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
      .update(forms)
      .set(
        buildSoftDeleteSet(forms, ['id', 'createdAt', 'updatedAt', 'deletedAt'], {
          updatedAt: now,
          deletedAt: now,
          status: 'dirty',
        })
      )
      .where(eq(forms.id, id));
  }

  async updateFieldsBatch(updates: { id: string; fields: Partial<Form> }[]): Promise<void> {
    for (const update of updates) {
      console.log('updating local images field');
      await db.update(forms).set(update.fields).where(eq(forms.id, update.id));
    }
  }
}
