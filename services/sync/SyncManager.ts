import { BaseSyncHandler } from './logic/BaseSyncHandler';
import { formatSyncDisplay, SyncRawState, DisplayStatus } from './utils/formatSyncStatus';

// ==================== Type Definitions ====================

type StatusListener = (state: SyncRawState) => void;
type UnsubscribeFn = () => void;
type SyncFailure = { at: Date; reason: string };

// ==================== Main Class ====================

/**
 * SyncManager orchestrates sync operations across multiple handlers.
 *
 * Responsibilities:
 * - Maintain singleton instance
 * - Register and execute sync handlers
 * - Track sync state (in-progress, success, failure)
 * - Notify subscribers of state changes
 * - Prevent concurrent sync operations
 *
 * Design Patterns:
 * - Singleton: Ensures single manager instance
 * - Observer: Notifies listeners of state changes
 * - Strategy: Delegates sync logic to handlers
 */
export class SyncManager {
  // ==================== Singleton ====================

  private static instance: SyncManager | null = null;

  private constructor() {}

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  // ==================== State ====================

  private handlers: BaseSyncHandler<any, any, any>[] = [];
  private isSyncing = false;
  private lastSyncedAt: Date | null = null;
  private lastSyncFailedAt: Date | null = null;
  private lastSyncFailure: SyncFailure | null = null;
  private listeners: StatusListener[] = [];

  // ==================== Public API ====================

  /**
   * Register a sync handler to be executed during sync.
   */
  public addHandler<
    LocalType extends {
      id: string;
      updatedAt: string | null;
      deletedAt: string | null;
      status: string | null;
    },
    RemoteType extends { id: string; updated_at: string | null; deleted_at: string | null },
    Table extends Record<string, any>,
  >(handler: BaseSyncHandler<LocalType, RemoteType, Table>): void {
    this.handlers.push(handler);
  }

  /**
   * Execute synchronization across all registered handlers.
   * Prevents concurrent syncs. Updates state and notifies listeners.
   */
  public async syncNow(): Promise<void> {
    // Guard: Prevent concurrent sync operations
    if (this.isSyncing) {
      return;
    }

    try {
      this.beginSync();
      const results = await this.executeAllHandlers();
      this.handleSyncResults(results);
    } catch (error: any) {
      this.handleSyncError(error);
    } finally {
      this.endSync();
    }
  }

  /**
   * Subscribe to sync state changes.
   * @returns Unsubscribe function
   */
  public subscribe(listener: StatusListener): UnsubscribeFn {
    this.listeners.push(listener);
    return this.createUnsubscribeFunction(listener);
  }

  /**
   * Get current raw sync state.
   */
  public getState(): SyncRawState {
    return {
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      lastSyncFailedAt: this.lastSyncFailedAt,
      lastSyncFailure: this.lastSyncFailure,
    };
  }

  /**
   * Get formatted display status for UI.
   */
  public getDisplayStatus(): DisplayStatus {
    return formatSyncDisplay(this.getState());
  }

  // ==================== Private Sync Orchestration ====================

  /**
   * Mark sync as started and notify listeners.
   */
  private beginSync(): void {
    console.log('syncing...');
    this.isSyncing = true;
    this.notifyListeners();
  }

  /**
   * Mark sync as ended and notify listeners.
   */
  private endSync(): void {
    this.isSyncing = false;
    this.notifyListeners();
  }

  /**
   * Execute all registered handlers in parallel.
   * Uses Promise.allSettled to capture all results (both success and failure).
   */
  private async executeAllHandlers(): Promise<PromiseSettledResult<void>[]> {
    return Promise.allSettled(this.handlers.map((handler) => handler.execute()));
  }

  /**
   * Process sync results and update state accordingly.
   */
  private handleSyncResults(results: PromiseSettledResult<void>[]): void {
    const failures = this.extractFailures(results);

    if (failures.length === 0) {
      this.recordSyncSuccess();
    } else {
      this.recordSyncFailure(failures);
    }
  }

  /**
   * Extract failed results from Promise.allSettled results.
   */
  private extractFailures(results: PromiseSettledResult<void>[]): PromiseRejectedResult[] {
    return results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  }

  /**
   * Handle unexpected errors during sync.
   */
  private handleSyncError(error: Error): void {
    console.error('SyncManager: syncNow() unexpected error', error);
    this.recordSyncFailure([], error);
  }

  // ==================== Private State Management ====================

  /**
   * Record successful sync completion.
   */
  private recordSyncSuccess(): void {
    console.log('sync success!', new Date());
    this.lastSyncedAt = new Date();
    this.lastSyncFailedAt = null;
    this.lastSyncFailure = null;
  }

  /**
   * Record sync failure with details.
   */
  private recordSyncFailure(failures: PromiseRejectedResult[], error?: Error): void {
    const now = new Date();
    this.lastSyncFailedAt = now;

    if (error) {
      // Unexpected error
      this.lastSyncFailure = { at: now, reason: error.message };
    } else {
      // Handler failures
      const failureCount = failures.length;
      this.lastSyncFailure = { at: now, reason: `${failureCount} handler(s) failed` };
      failures.forEach((failure) => console.error('Handler failed', failure));
    }
  }

  // ==================== Private Observer Pattern ====================

  /**
   * Notify all subscribers of current state.
   * Creates defensive copy to prevent modification during iteration.
   */
  private notifyListeners(): void {
    const state = this.getState();
    const listenersCopy = [...this.listeners];
    listenersCopy.forEach((listener) => this.invokeListener(listener, state));
  }

  /**
   * Safely invoke a listener, catching any errors.
   */
  private invokeListener(listener: StatusListener, state: SyncRawState): void {
    try {
      listener(state);
    } catch (error) {
      console.error('Error in sync state listener:', error);
    }
  }

  /**
   * Create unsubscribe function for a specific listener.
   */
  private createUnsubscribeFunction(listener: StatusListener): UnsubscribeFn {
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export default SyncManager;
