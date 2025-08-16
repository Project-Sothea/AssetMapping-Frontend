import { BaseSyncHandler } from './handlers/BaseSyncHandler';
type StatusListener = (displayStatus: DisplayStatus) => void;
type DisplayStatus = {
  text: string;
  color: string;
};

export class SyncManager {
  private listeners: StatusListener[] = [];

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
      this.setSyncEnd();
    }
  }

  private setSyncStart() {
    this.isSyncing = true;
    this.notifyListeners();
  }

  private setSyncEnd() {
    this.isSyncing = false;
    this.notifyListeners();
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

  public subscribe(listener: StatusListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const status = this.getDisplayStatus();
    this.listeners.forEach((l) => l(status));
  }

  public getDisplayStatus(): DisplayStatus {
    if (this.isSyncing) {
      return { text: 'Syncing...', color: '#3498db' };
    }

    if (
      this.lastSyncFailedAt &&
      (!this.lastSyncedAt || this.lastSyncFailedAt >= this.lastSyncedAt)
    ) {
      return {
        text: ` Sync (failed ${this.lastSyncFailedAt.toLocaleTimeString()})`,
        color: '#f39c12',
      };
    }

    if (this.lastSyncedAt) {
      return {
        text: `Sync (last ${this.lastSyncedAt.toLocaleTimeString()})`,
        color: '#2ecc71',
      };
    }

    return { text: 'Unsynced', color: '#e74c3c' };
  }
}

export default SyncManager;
