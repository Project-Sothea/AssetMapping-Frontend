export default interface RemoteRepository<T> {
  fetchAll(): Promise<T[]>;
  upsertAll(items: T[]): Promise<void>;

  updateFieldsBatch(updates: Partial<T>[]): Promise<void>;
}
