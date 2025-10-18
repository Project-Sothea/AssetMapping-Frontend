import {
  convertKeysToCamel,
  convertKeysToSnake,
  parseArrayFields,
  stringifyArrayFields,
} from '~/utils/dataShapes';

// ==================== Type Definitions ====================

type SyncResult<LocalType, RemoteType> = {
  toLocal: RemoteType[];
  toRemote: LocalType[];
};

type ItemPair<LocalType, RemoteType> = {
  localItem: LocalType | undefined;
  remoteItem: RemoteType | undefined;
};

// ==================== Constants ====================

const DIRTY_STATUS = 'dirty' as const;
const EPOCH_ZERO = 0 as const;

// ==================== Main Class ====================

/**
 * Strategy for synchronizing local and remote data.
 * Handles data transformation and conflict resolution.
 *
 * Responsibilities:
 * - Convert between local and remote formats
 * - Resolve conflicts based on timestamps and status
 * - Determine sync direction for each item
 */
export class SyncStrategy<
  LocalType extends {
    id: string;
    updatedAt: string | null;
    deletedAt: string | null;
    status: string | null;
  },
  RemoteType extends { id: string; updated_at: string | null; deleted_at: string | null },
> {
  // ==================== Data Transformation ====================

  /**
   * Convert remote items to local format.
   * Applies snake_case → camelCase transformation and stringifies arrays.
   */
  convertToLocal(remoteItems: RemoteType[]): LocalType[] {
    return remoteItems.map(this.transformRemoteToLocal);
  }

  /**
   * Convert local items to remote format.
   * Applies camelCase → snake_case transformation and parses arrays.
   */
  convertToRemote(localItems: LocalType[]): RemoteType[] {
    return localItems.map(this.transformLocalToRemote);
  }

  // ==================== Conflict Resolution ====================

  /**
   * Resolve sync conflicts between local and remote items.
   * Determines which items need to be synced in which direction.
   *
   * Algorithm:
   * 1. Identify all unique IDs across both sets
   * 2. For each ID, determine sync direction:
   *    - New items → sync to opposite side
   *    - Deletions → propagate deletion
   *    - Conflicts → resolve by timestamp and status
   *
   * @returns Items that need to be synced in each direction
   */
  resolve(local: LocalType[], remote: RemoteType[]): SyncResult<LocalType, RemoteType> {
    const result: SyncResult<LocalType, RemoteType> = {
      toLocal: [],
      toRemote: [],
    };

    const allIds = this.getAllUniqueIds(local, remote);

    for (const id of allIds) {
      const pair = this.getItemPair(id, local, remote);
      this.resolveItemPair(pair, result);
    }

    return result;
  }

  // ==================== Private Helper Methods ====================

  /**
   * Transform a single remote item to local format.
   */
  private transformRemoteToLocal(remoteItem: RemoteType): LocalType {
    return stringifyArrayFields(convertKeysToCamel(remoteItem));
  }

  /**
   * Transform a single local item to remote format.
   */
  private transformLocalToRemote(localItem: LocalType): RemoteType {
    return parseArrayFields(convertKeysToSnake(localItem));
  }

  /**
   * Get all unique IDs from both local and remote item sets.
   */
  private getAllUniqueIds(local: LocalType[], remote: RemoteType[]): Set<string> {
    return new Set<string>([...local.map((item) => item.id), ...remote.map((item) => item.id)]);
  }

  /**
   * Find corresponding local and remote items for a given ID.
   */
  private getItemPair(
    id: string,
    local: LocalType[],
    remote: RemoteType[]
  ): ItemPair<LocalType, RemoteType> {
    return {
      localItem: local.find((item) => item.id === id),
      remoteItem: remote.find((item) => item.id === id),
    };
  }

  /**
   * Resolve sync direction for a pair of local/remote items.
   * Applies conflict resolution rules and updates result.
   */
  private resolveItemPair(
    pair: ItemPair<LocalType, RemoteType>,
    result: SyncResult<LocalType, RemoteType>
  ): void {
    const { localItem, remoteItem } = pair;

    // Guard: Handle new items (exist on one side only)
    if (this.handleNewItems(localItem, remoteItem, result)) {
      return;
    }

    // Guard: Both items must exist for conflict resolution
    if (!localItem || !remoteItem) {
      return;
    }

    // Guard: Handle deletion propagation
    if (this.handleDeletions(localItem, remoteItem, result)) {
      return;
    }

    // Resolve based on timestamps and status
    this.resolveByTimestamp(localItem, remoteItem, result);
  }

  /**
   * Handle items that exist on one side only.
   * @returns true if handled, false if both items exist
   */
  private handleNewItems(
    localItem: LocalType | undefined,
    remoteItem: RemoteType | undefined,
    result: SyncResult<LocalType, RemoteType>
  ): boolean {
    // New remote item (doesn't exist locally)
    if (!localItem && remoteItem) {
      result.toLocal.push(remoteItem);
      return true;
    }

    // New local item (doesn't exist remotely)
    if (!remoteItem && localItem) {
      result.toRemote.push(localItem);
      return true;
    }

    return false;
  }

  /**
   * Handle deletion propagation between local and remote.
   * @returns true if deletion handled, false if neither is deleted
   */
  private handleDeletions(
    localItem: LocalType,
    remoteItem: RemoteType,
    result: SyncResult<LocalType, RemoteType>
  ): boolean {
    // Remote deleted → pull deletion to local
    if (this.isDeleted(remoteItem) && !this.isDeleted(localItem)) {
      result.toLocal.push(remoteItem);
      return true;
    }

    // Local deleted → push deletion to remote
    if (this.isDeleted(localItem) && !this.isDeleted(remoteItem)) {
      result.toRemote.push(localItem);
      return true;
    }

    return false;
  }

  /**
   * Resolve conflict based on timestamp comparison.
   * Newer timestamp wins. On tie, dirty local status wins.
   */
  private resolveByTimestamp(
    localItem: LocalType,
    remoteItem: RemoteType,
    result: SyncResult<LocalType, RemoteType>
  ): void {
    const localTime = this.getEffectiveTimestamp(localItem);
    const remoteTime = this.getEffectiveTimestamp(remoteItem);

    if (remoteTime > localTime) {
      // Remote is newer → pull to local
      result.toLocal.push(remoteItem);
    } else if (localTime > remoteTime) {
      // Local is newer → push to remote
      result.toRemote.push(localItem);
    } else {
      // Equal timestamps → check dirty status
      this.resolveTimestampTie(localItem, result);
    }
  }

  /**
   * Resolve tie when timestamps are equal.
   * Dirty local items win and are pushed to remote.
   */
  private resolveTimestampTie(
    localItem: LocalType,
    result: SyncResult<LocalType, RemoteType>
  ): void {
    if (this.isDirty(localItem)) {
      result.toRemote.push(localItem);
    }
    // If not dirty, no sync needed (already in sync)
  }

  /**
   * Get the most recent timestamp for an item.
   * Prioritizes deletedAt over updatedAt. Returns epoch zero if both null.
   */
  private getEffectiveTimestamp(item: LocalType | RemoteType): number {
    const timestampString = this.getTimestampString(item);
    return timestampString ? new Date(timestampString).getTime() : EPOCH_ZERO;
  }

  /**
   * Get timestamp string from item (handles both local and remote formats).
   */
  private getTimestampString(item: LocalType | RemoteType): string | null {
    // Check if it's a local item (has deletedAt/updatedAt)
    if ('deletedAt' in item) {
      return (item as LocalType).deletedAt ?? (item as LocalType).updatedAt;
    }
    // It's a remote item (has deleted_at/updated_at)
    return (item as RemoteType).deleted_at ?? (item as RemoteType).updated_at;
  }

  /**
   * Check if an item is marked as deleted.
   */
  private isDeleted(item: LocalType | RemoteType): boolean {
    return 'deletedAt' in item
      ? !!(item as LocalType).deletedAt
      : !!(item as RemoteType).deleted_at;
  }

  /**
   * Check if local item has unsaved changes.
   */
  private isDirty(localItem: LocalType): boolean {
    return localItem.status === DIRTY_STATUS;
  }
}
