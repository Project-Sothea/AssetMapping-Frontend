import SyncStrategy from './interfaces/SyncStrategy';
import LocalRepository from './interfaces/LocalRepository';
import RemoteRepository from './interfaces/RemoteRepository';
import { ImageSyncService } from './ImageSyncService';
import { ConnectivityManager } from '../ConnectivityManager';

class SyncManager<LocalType, RemoteType> {
  private static instances: Map<string, SyncManager<any, any>> = new Map();
  private isSyncing = false; //handle deduplication
  private lastSyncedAt: Date | null = null;
  private lastSyncFailedAt: Date | null = null;
  private lastSyncFailure: { at: Date; reason: string } | null = null;

  public static getInstance<LocalType, RemoteType>(
    key: 'pin' | 'form',
    syncStrategy: SyncStrategy<LocalType, RemoteType>,
    localRepo: LocalRepository<LocalType>,
    remoteRepo: RemoteRepository<RemoteType>,
    imageSyncService?: ImageSyncService<LocalType>
  ): SyncManager<LocalType, RemoteType> {
    if (!SyncManager.instances.has(key)) {
      const instance = new SyncManager(syncStrategy, localRepo, remoteRepo, imageSyncService);
      SyncManager.instances.set(key, instance);
    }
    return SyncManager.instances.get(key)!;
  }

  private constructor(
    private syncStrategy: SyncStrategy<LocalType, RemoteType>,
    private localRepo: LocalRepository<LocalType>,
    private remoteRepo: RemoteRepository<RemoteType>,
    private imageSyncService?: ImageSyncService<LocalType>
  ) {}

  public async syncNow() {
    try {
      if (!ConnectivityManager.getInstance().getConnectionStatus()) {
        console.log('Skipping sync: offline');
        return;
      }

      if (this.isSyncing) return;
      this.setSyncStart();
      console.log('syncing...');

      const remoteItems = await this.remoteRepo.fetchAll();
      console.log('remote fetched OK');

      const localItems = await this.localRepo.fetchAll();
      console.log('local fetched OK');

      const { toLocal, toRemote } = this.syncStrategy.resolve(localItems, remoteItems);
      console.log('toLocal', toLocal);
      console.log('toRemote', toRemote);

      const formattedToRemote = this.syncStrategy.convertToRemote(toRemote);
      const formattedToLocal = this.syncStrategy.convertToLocal(toLocal);

      console.log('syncImagesLocal ok');

      await this.localRepo.upsertAll(formattedToLocal);
      await this.remoteRepo.upsertAll(formattedToRemote);

      if (this.imageSyncService) {
        const incomingData: { id: string; images: string }[] = formattedToLocal.map((item) => ({
          id: (item as any).id,
          images: (item as any).images,
        }));
        const localImages = await this.imageSyncService.syncRemoteToLocal(incomingData); //
        await this.setlocalImagesField(localImages);
      }
      await this.localRepo.markAsSynced(formattedToLocal);
      await this.localRepo.markAsSynced(toRemote);

      this.setSyncSuccess();
      console.log('sync done', new Date());
    } catch (e: any) {
      console.error('SyncManager: syncNow()', e);
      this.setSyncFailure(e);
    }
  }

  public async setlocalImagesField(
    localImages: {
      id: string;
      fields: Partial<LocalType>;
    }[]
  ) {
    console.log('setlocalImagesField', localImages);
    await this.localRepo.updateFieldsBatch(localImages);
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
}

export default SyncManager;
