export default interface LocalRepository<T> {
  getDirty(): Promise<T[]>;
  upsertFromRemote(items: T[]): Promise<void>;
  upsertAll(items: T[]): Promise<void>;
  markAsSynced(items: T[]): Promise<void>;
}
