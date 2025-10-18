/**
 * Comprehensive tests for SyncManager
 *
 * Tests the orchestration of sync handlers, state management, and subscription system
 */

import { SyncManager } from '../SyncManager';

// Mock handler classes
class PassingHandler {
  async execute() {
    return Promise.resolve();
  }
}

class FailingHandler {
  async execute() {
    throw new Error('handler failed');
  }
}

describe('SyncManager', () => {
  let manager: SyncManager;

  beforeEach(() => {
    // Get a fresh instance for each test
    manager = SyncManager.getInstance();
    // Reset handlers and state
    (manager as any).handlers = [];
    (manager as any).isSyncing = false;
    (manager as any).lastSyncedAt = null;
    (manager as any).lastSyncFailedAt = null;
    (manager as any).lastSyncFailure = null;
    (manager as any).listeners = [];
  });

  describe('Singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = SyncManager.getInstance();
      const instance2 = SyncManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('addHandler', () => {
    it('should add handlers to the handlers array', () => {
      const handler = new PassingHandler() as any;

      manager.addHandler(handler);

      expect((manager as any).handlers).toContain(handler);
    });

    it('should allow adding multiple handlers', () => {
      const handler1 = new PassingHandler() as any;
      const handler2 = new PassingHandler() as any;

      manager.addHandler(handler1);
      manager.addHandler(handler2);

      expect((manager as any).handlers).toHaveLength(2);
      expect((manager as any).handlers).toContain(handler1);
      expect((manager as any).handlers).toContain(handler2);
    });
  });

  describe('syncNow - Success scenarios', () => {
    it('should execute all handlers when sync is successful', async () => {
      const executeMock1 = jest.fn().mockResolvedValue(undefined);
      const executeMock2 = jest.fn().mockResolvedValue(undefined);

      manager.addHandler({ execute: executeMock1 } as any);
      manager.addHandler({ execute: executeMock2 } as any);

      await manager.syncNow();

      expect(executeMock1).toHaveBeenCalledTimes(1);
      expect(executeMock2).toHaveBeenCalledTimes(1);
    });

    it('should update lastSyncedAt timestamp on success', async () => {
      manager.addHandler(new PassingHandler() as any);

      const beforeSync = new Date();
      await manager.syncNow();
      const afterSync = new Date();

      const state = manager.getState();
      expect(state.lastSyncedAt).not.toBeNull();
      expect(state.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      expect(state.lastSyncedAt!.getTime()).toBeLessThanOrEqual(afterSync.getTime());
    });

    it('should clear lastSyncFailure on successful sync', async () => {
      // First, cause a failure
      manager.addHandler(new FailingHandler() as any);
      await manager.syncNow();

      expect(manager.getState().lastSyncFailure).not.toBeNull();

      // Then, succeed
      (manager as any).handlers = [];
      manager.addHandler(new PassingHandler() as any);
      await manager.syncNow();

      const state = manager.getState();
      expect(state.lastSyncFailure).toBeNull();
      expect(state.lastSyncFailedAt).toBeNull();
    });

    it('should set isSyncing to false after successful sync', async () => {
      manager.addHandler(new PassingHandler() as any);

      await manager.syncNow();

      expect(manager.getState().isSyncing).toBe(false);
    });
  });

  describe('syncNow - Failure scenarios', () => {
    it('should reflect handler failures in state', async () => {
      manager.addHandler(new PassingHandler() as any);
      manager.addHandler(new FailingHandler() as any);

      await manager.syncNow();

      const state = manager.getState();
      expect(state.lastSyncFailedAt).not.toBeNull();
      expect(state.lastSyncFailure).not.toBeNull();
      expect(state.lastSyncFailure?.reason).toMatch(/1 handler\(s\) failed/);
    });

    it('should continue executing other handlers when one fails', async () => {
      const executeMock = jest.fn().mockResolvedValue(undefined);

      manager.addHandler(new FailingHandler() as any);
      manager.addHandler({ execute: executeMock } as any);

      await manager.syncNow();

      // The passing handler should still be called despite the failure
      expect(executeMock).toHaveBeenCalledTimes(1);
    });

    it('should count multiple handler failures correctly', async () => {
      manager.addHandler(new FailingHandler() as any);
      manager.addHandler(new FailingHandler() as any);
      manager.addHandler(new PassingHandler() as any);

      await manager.syncNow();

      const state = manager.getState();
      expect(state.lastSyncFailure?.reason).toMatch(/2 handler\(s\) failed/);
    });

    it('should set isSyncing to false after failed sync', async () => {
      manager.addHandler(new FailingHandler() as any);

      await manager.syncNow();

      expect(manager.getState().isSyncing).toBe(false);
    });

    it('should update lastSyncFailedAt timestamp on failure', async () => {
      manager.addHandler(new FailingHandler() as any);

      const beforeSync = new Date();
      await manager.syncNow();
      const afterSync = new Date();

      const state = manager.getState();
      expect(state.lastSyncFailedAt).not.toBeNull();
      expect(state.lastSyncFailedAt!.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      expect(state.lastSyncFailedAt!.getTime()).toBeLessThanOrEqual(afterSync.getTime());
    });
  });

  describe('syncNow - Deduplication', () => {
    it('should prevent concurrent syncs (deduplication)', async () => {
      const executeMock = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      });

      manager.addHandler({ execute: executeMock } as any);

      // Start two syncs concurrently
      const sync1Promise = manager.syncNow();
      const sync2Promise = manager.syncNow();

      await Promise.all([sync1Promise, sync2Promise]);

      // Should only execute once due to deduplication
      expect(executeMock).toHaveBeenCalledTimes(1);
    });

    it('should set isSyncing to true during sync', async () => {
      let isSyncingDuringExecution = false;

      const executeMock = jest.fn().mockImplementation(async () => {
        isSyncingDuringExecution = manager.getState().isSyncing;
      });

      manager.addHandler({ execute: executeMock } as any);

      await manager.syncNow();

      expect(isSyncingDuringExecution).toBe(true);
      expect(manager.getState().isSyncing).toBe(false);
    });
  });

  describe('Subscription system', () => {
    it('should notify listeners when sync starts and ends', async () => {
      const listener = jest.fn();
      manager.subscribe(listener);

      manager.addHandler(new PassingHandler() as any);

      await manager.syncNow();

      // Should be called at least twice: start and end
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should send correct state to listeners', async () => {
      const states: any[] = [];
      const listener = jest.fn((state) => states.push({ ...state }));

      manager.subscribe(listener);
      manager.addHandler(new PassingHandler() as any);

      await manager.syncNow();

      // First call: sync start (isSyncing = true)
      expect(states[0].isSyncing).toBe(true);

      // Last call: sync end (isSyncing = false)
      expect(states[states.length - 1].isSyncing).toBe(false);
    });

    it('should return unsubscribe function that removes listener', async () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();

      manager.addHandler(new PassingHandler() as any);
      await manager.syncNow();

      // Listener should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.subscribe(listener1);
      manager.subscribe(listener2);

      manager.addHandler(new PassingHandler() as any);
      await manager.syncNow();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should not affect other listeners when one unsubscribes', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      manager.subscribe(listener1);
      const unsubscribe2 = manager.subscribe(listener2);

      unsubscribe2();

      manager.addHandler(new PassingHandler() as any);
      await manager.syncNow();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it('should handle listener being removed during notification', async () => {
      let unsubscribe: (() => void) | null = null;

      const listener = jest.fn(() => {
        if (unsubscribe) unsubscribe();
      });

      unsubscribe = manager.subscribe(listener);

      manager.addHandler(new PassingHandler() as any);

      // Should not throw even though listener removes itself
      await expect(manager.syncNow()).resolves.not.toThrow();
    });
  });

  describe('getState', () => {
    it('should return initial state before any sync', () => {
      const state = manager.getState();

      expect(state).toEqual({
        isSyncing: false,
        lastSyncedAt: null,
        lastSyncFailedAt: null,
        lastSyncFailure: null,
      });
    });

    it('should return current state after sync', async () => {
      manager.addHandler(new PassingHandler() as any);

      await manager.syncNow();

      const state = manager.getState();
      expect(state.isSyncing).toBe(false);
      expect(state.lastSyncedAt).not.toBeNull();
      expect(state.lastSyncFailedAt).toBeNull();
      expect(state.lastSyncFailure).toBeNull();
    });
  });

  describe('getDisplayStatus', () => {
    it('should return formatted display status', () => {
      const displayStatus = manager.getDisplayStatus();

      expect(displayStatus).toHaveProperty('text');
      expect(displayStatus).toHaveProperty('color');
      expect(typeof displayStatus.text).toBe('string');
      expect(typeof displayStatus.color).toBe('string');
    });

    it('should return different status after sync', async () => {
      const beforeStatus = manager.getDisplayStatus();

      manager.addHandler(new PassingHandler() as any);
      await manager.syncNow();

      const afterStatus = manager.getDisplayStatus();

      // Status should change after sync (at minimum, timestamp changes)
      expect(afterStatus).not.toEqual(beforeStatus);
    });
  });

  describe('Edge cases', () => {
    it('should handle sync with no handlers', async () => {
      await expect(manager.syncNow()).resolves.not.toThrow();

      const state = manager.getState();
      expect(state.lastSyncedAt).not.toBeNull();
    });

    it('should handle all handlers failing', async () => {
      manager.addHandler(new FailingHandler() as any);
      manager.addHandler(new FailingHandler() as any);

      await manager.syncNow();

      const state = manager.getState();
      expect(state.lastSyncFailure?.reason).toMatch(/2 handler\(s\) failed/);
    });

    it('should handle handlers that throw non-Error objects', async () => {
      const stringThrowingHandler = {
        async execute() {
          throw 'string error';
        },
      };

      manager.addHandler(stringThrowingHandler as any);

      await expect(manager.syncNow()).resolves.not.toThrow();

      const state = manager.getState();
      expect(state.lastSyncFailedAt).not.toBeNull();
    });
  });
});
