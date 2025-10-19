// SyncHandler.ts
import { LocalRepository } from '../repositories/LocalRepository';
import { RemoteRepository } from '../repositories/RemoteRepository';
import { SyncStrategy } from './syncing/SyncStrategy';

// ==================== Type Definitions ====================

type SyncResolution<LocalType, RemoteType> = {
  toLocal: RemoteType[];
  toRemote: LocalType[];
};

// ==================== Abstract Base Class ====================

/**
 * Abstract base class defining the sync lifecycle.
 *
 * Responsibilities:
 * - Orchestrate sync flow across repositories
 * - Coordinate conflict resolution via strategy
 * - Execute data transformations and upserts
 * - Provide extension point for entity-specific logic
 *
 * Template Method Pattern:
 * - execute() defines the algorithm skeleton
 * - postSync() is the hook for subclass customization
 *
 * Sync Flow:
 * 1. Fetch: Retrieve items from both repositories
 * 2. Resolve: Determine sync direction for each item
 * 3. Convert: Transform items to target format
 * 4. Upsert: Save items to target repositories
 * 5. PostSync: Execute entity-specific operations (hook)
 * 6. MarkSynced: Update sync status in local repository
 */
export abstract class BaseSyncHandler<
  LocalType extends {
    id: string;
    updatedAt: string | null;
    deletedAt: string | null;
    status: string | null;
  },
  RemoteType extends { id: string; updatedAt: string | null; deletedAt: string | null },
  Table extends Record<string, any>,
> {
  constructor(
    protected strategy: SyncStrategy<LocalType, RemoteType>,
    protected localRepo: LocalRepository<LocalType, Table>,
    protected remoteRepo: RemoteRepository<RemoteType>
  ) {}

  // ==================== Public API ====================

  /**
   * Execute complete sync operation.
   * Orchestrates all sync phases in correct order.
   */
  async execute(): Promise<void> {
    console.log('executing handler');

    // Phase 1: Fetch all items from both repositories
    const { localItems, remoteItems } = await this.fetchAllItems();

    // Phase 2: Resolve conflicts and determine sync direction
    const resolution = this.resolveConflicts(localItems, remoteItems);

    // Phase 3: Convert items to target formats
    const { localUpserts, remoteUpserts } = this.convertForUpsert(resolution);

    // Phase 4: Upsert items to target repositories
    await this.upsertToRepositories(localUpserts, remoteUpserts);

    // Phase 5: Execute entity-specific post-sync operations
    await this.executePostSync(localUpserts, resolution.toRemote);

    // Phase 6: Mark items as successfully synced
    await this.markItemsAsSynced(localUpserts, resolution.toLocal);
  }

  // ==================== Template Method Hook ====================

  /**
   * Hook for subclasses to implement entity-specific logic after core sync.
   *
   * Examples:
   * - PinSyncHandler: Download/upload images
   * - FormSyncHandler: Validate form data
   * - UserSyncHandler: Update profile cache
   *
   * @param syncedToLocalItems Items synced to local repository
   * @param syncedToRemoteItems Original local items that were synced to remote repository
   */
  protected abstract postSync(
    syncedToLocalItems: LocalType[],
    syncedToRemoteItems: LocalType[]
  ): Promise<void>;

  // ==================== Private Sync Phases ====================

  /**
   * Phase 1: Fetch all items from both repositories in parallel.
   */
  private async fetchAllItems(): Promise<{
    localItems: LocalType[];
    remoteItems: RemoteType[];
  }> {
    const [localItems, remoteItems] = await Promise.all([
      this.localRepo.fetchAll(),
      this.remoteRepo.fetchAll(),
    ]);

    return { localItems, remoteItems };
  }

  /**
   * Phase 2: Use strategy to resolve conflicts between local and remote.
   */
  private resolveConflicts(
    localItems: LocalType[],
    remoteItems: RemoteType[]
  ): SyncResolution<LocalType, RemoteType> {
    return this.strategy.resolve(localItems, remoteItems);
  }

  /**
   * Phase 3: Convert items to appropriate formats for upsert.
   */
  private convertForUpsert(resolution: SyncResolution<LocalType, RemoteType>): {
    localUpserts: LocalType[];
    remoteUpserts: RemoteType[];
  } {
    const localUpserts = this.strategy.convertToLocal(resolution.toLocal);
    const remoteUpserts = this.strategy.convertToRemote(resolution.toRemote);

    return { localUpserts, remoteUpserts };
  }

  /**
   * Phase 4: Upsert items to target repositories in parallel.
   */
  private async upsertToRepositories(
    localUpserts: LocalType[],
    remoteUpserts: RemoteType[]
  ): Promise<void> {
    await Promise.all([
      this.localRepo.upsertAll(localUpserts),
      this.remoteRepo.upsertAll(remoteUpserts),
    ]);
  }

  private async executePostSync(
    localUpserts: LocalType[],
    remoteUpserts: LocalType[]
  ): Promise<void> {
    console.log('postsync start');
    await this.postSync(localUpserts, remoteUpserts);
    console.log('postsync end');
  }

  /**
   * Phase 6: Mark all synced items with 'synced' status.
   * Combines items synced to local with converted remote items that were pulled.
   */
  private async markItemsAsSynced(
    localUpserts: LocalType[],
    remotePulled: RemoteType[]
  ): Promise<void> {
    // Convert remote items to local format for marking
    const remotePulledAsLocal = this.strategy.convertToLocal(remotePulled);
    const allSyncedItems = [...localUpserts, ...remotePulledAsLocal];
    await this.localRepo.markAsSynced(allSyncedItems);
  }
}
