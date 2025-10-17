import { SyncManager } from '../SyncManager';

class PassingHandler {
  async execute() {
    return;
  }
}

class FailingHandler {
  async execute() {
    throw new Error('handler failed');
  }
}

test('SyncManager.syncNow reflects handler failures', async () => {
  const manager = SyncManager.getInstance();

  // reset any handlers
  // ...we'll rely on addHandler only for test
  (manager as any).handlers = [];

  manager.addHandler(new PassingHandler() as any);
  manager.addHandler(new FailingHandler() as any);

  await manager.syncNow();

  const state = manager.getState();
  expect(state.lastSyncFailedAt).not.toBeNull();
  expect(state.lastSyncFailure).not.toBeNull();
  expect(state.lastSyncFailure?.reason).toMatch(/1 handler\(s\) failed/);
});
