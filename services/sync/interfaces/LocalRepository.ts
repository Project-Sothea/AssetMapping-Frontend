export default interface LocalRepository<T> {
  getDirty(): Promise<T[]>;
  upsertAll(items: T[]): Promise<void>;
  markAsSynced(items: T[]): Promise<void>;
  fetchAll(): Promise<T[]>;
}
