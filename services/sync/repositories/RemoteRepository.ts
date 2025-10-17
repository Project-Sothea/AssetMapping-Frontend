export interface RemoteRepository<T = any> {
  fetchAll(): Promise<T[]>;
  upsertAll(items: Partial<T>[]): Promise<void>;
  updateFieldsBatch(updates: ({ id: string } & Partial<T>)[]): Promise<void>;
}

// default export placeholder to satisfy imports that use default import syntax
const _default: RemoteRepository<any> = {
  fetchAll: async () => [],
  upsertAll: async () => {},
  updateFieldsBatch: async () => {},
};

export default _default;
