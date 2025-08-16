import { BaseSyncHandler } from './handlers/BaseSyncHandler';

export class SyncManager {
  private static instance: SyncManager | null = null;

  private isSyncing = false; // handle deduplication
  private handlers: BaseSyncHandler<any, any, any>[] = [];
  private lastSyncedAt: Date | null = null;
  private lastSyncFailedAt: Date | null = null;
  private lastSyncFailure: { at: Date; reason: string } | null = null;

  private constructor() {}

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  public addHandler<
    LocalType extends {
      id: string;
      updatedAt: string | null;
      deletedAt: string | null;
      status: string | null;
    },
    RemoteType extends { id: string; updated_at: string | null; deleted_at: string | null },
    Table extends Record<string, any>,
  >(handler: BaseSyncHandler<LocalType, RemoteType, Table>) {
    this.handlers.push(handler);
  }

  public async syncNow() {
    try {
      if (this.isSyncing) return;
      this.setSyncStart();
      console.log('syncing...');

      const results = await Promise.allSettled(this.handlers.map((h) => h.execute()));

      const failures = results.filter((r) => r.status === 'rejected');
      failures.forEach((f) => console.error('Handler failed', f));

      if (failures.length === 0) {
        this.setSyncSuccess();
        console.log('sync success!', new Date());
      } else {
        this.setSyncFailure(new Error(`${failures.length} handler(s) failed`));
      }
    } catch (e: any) {
      console.error('SyncManager: syncNow()', e);
      this.setSyncFailure(e);
    } finally {
      this.isSyncing = false;
    }
  }

  private setSyncStart() {
    this.isSyncing = true;
  }

  private setSyncSuccess() {
    this.lastSyncedAt = new Date();
    this.isSyncing = false;
    this.lastSyncFailedAt = null;
    this.lastSyncFailure = null;
  }

  private setSyncFailure(e: Error) {
    this.lastSyncFailedAt = new Date();
    this.lastSyncFailure = { at: this.lastSyncFailedAt, reason: e.message };
    this.isSyncing = false;
  }

  public getSyncStatus(): { state: string; at: string } {
    if (this.isSyncing) {
      return { state: 'Syncing', at: 'n.a.' };
    }

    // If last sync failed is more recent than last successful sync
    if (
      this.lastSyncFailedAt &&
      (!this.lastSyncedAt || this.lastSyncFailedAt > this.lastSyncedAt)
    ) {
      return { state: 'Local', at: this.lastSyncFailedAt.toISOString() };
    }

    // If last successful sync is more recent or exists without failure
    if (this.lastSyncedAt) {
      return { state: 'Remote', at: this.lastSyncedAt.toISOString() };
    }

    return { state: 'Unsynced', at: 'n.a.' };
  }
}

export default SyncManager;
