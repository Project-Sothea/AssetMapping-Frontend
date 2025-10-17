import { BaseSyncHandler } from '../BaseSyncHandler';

class FakeLocalRepo {
  async fetchAll() {
    return [];
  }
  async upsertAll() {
    return;
  }
  async markAsSynced() {
    return;
  }
}

class FakeRemoteRepo {
  async fetchAll() {
    return [];
  }
  async upsertAll() {
    throw new Error('remote upsert failure');
  }
}

class ConcreteHandler extends BaseSyncHandler<any, any, any> {
  protected async postSync(): Promise<void> {
    return;
  }
}

const fakeStrategy = {
  resolve: (local: any[], remote: any[]) => ({ toLocal: [], toRemote: [] }),
  convertToLocal: (r: any[]) => r,
  convertToRemote: (l: any[]) => l,
};

test('BaseSyncHandler should reject when remote upsert fails', async () => {
  const handler = new ConcreteHandler(
    fakeStrategy as any,
    new FakeLocalRepo() as any,
    new FakeRemoteRepo() as any
  );
  await expect(handler.execute()).rejects.toThrow('remote upsert failure');
});
