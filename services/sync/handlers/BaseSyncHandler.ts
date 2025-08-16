// SyncHandler.ts
import { LocalRepository } from '../implementations/LocalRepository';
import RemoteRepository from '../implementations/RemoteRepository';
import { SyncStrategy } from '../implementations/SyncStrategy';

/**
 * Abstract base class that defines the sync lifecycle.
 */
export abstract class BaseSyncHandler<
  LocalType extends {
    id: string;
    updatedAt: string | null;
    deletedAt: string | null;
    status: string | null;
  },
  RemoteType extends { id: string; updated_at: string | null; deleted_at: string | null },
  Table extends Record<string, any>,
> {
  constructor(
    protected strategy: SyncStrategy<LocalType, RemoteType>,
    protected localRepo: LocalRepository<LocalType, Table>,
    protected remoteRepo: RemoteRepository<RemoteType>
  ) {}

  /**
   * Main sync flow: fetch → resolve → convert → upsert → hooks → mark synced
   */
  async execute(): Promise<void> {
    console.log('executing handler');
    const [localItems, remoteItems] = await Promise.all([
      this.localRepo.fetchAll(),
      this.remoteRepo.fetchAll(),
    ]);
    const { toLocal, toRemote } = this.strategy.resolve(localItems, remoteItems);

    const localUpserts = this.strategy.convertToLocal(toLocal);
    const remoteUpserts = this.strategy.convertToRemote(toRemote);

    console.log('Upserting local items:', localUpserts.length);
    console.log('Upserting remote items:', remoteUpserts.length);

    await Promise.all([
      this.localRepo.upsertAll(localUpserts),
      this.remoteRepo.upsertAll(remoteUpserts),
    ]);

    await this.postSync(localUpserts, remoteUpserts);
    try {
      await Promise.all([
        (async () => {
          try {
            await this.localRepo.markAsSynced(localUpserts); // items coming from remote
          } catch (err) {
            console.error('markAsSynced failed for localUpserts:', localUpserts, err);
            throw err;
          }
        })(),
        (async () => {
          try {
            await this.localRepo.markAsSynced(toRemote); // items sent to remote
          } catch (err) {
            console.error('markAsSynced failed for toRemote:', toRemote, err);
            throw err;
          }
        })(),
      ]);
    } catch (err) {
      console.error('Error during markAsSynced step:', err);
      throw err;
    }
  }

  /**
   * Hook for subclasses to implement extra logic after core syncing.
   * Examples:
   * - Download images for Pins
   * - Trigger background jobs for Forms
   */
  protected abstract postSync(
    syncedLocalItems: LocalType[],
    syncedRemoteItems: RemoteType[]
  ): Promise<void>;
}
