export default interface LocalRepository<T> {
  getDirty(): Promise<T[]>;
  upsertAll(items: T[]): Promise<void>;
  markAsSynced(items: T[]): Promise<void>;
  fetchAll(): Promise<T[]>;
  get(id: string): Promise<T>;
  create(item: T): Promise<void>;
  update(item: T): Promise<void>;
  upsert(item: T): Promise<void>;
  delete(id: string): Promise<void>;
  updateFieldsBatch(updates: { id: string; fields: Partial<T> }[]): Promise<void>;
}
