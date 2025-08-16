// PinSyncHandler.ts
import { pins } from '~/db/schema';
import { BaseSyncHandler } from './BaseSyncHandler';
import { Pin, RePin } from '~/utils/globalTypes';
import { SyncStrategy } from '../implementations/SyncStrategy';
import { LocalRepository } from '../implementations/LocalRepository';
import RemoteRepository from '../implementations/RemoteRepository';
import { ImageSyncService } from '../image/ImageSyncService';

export class PinSyncHandler extends BaseSyncHandler<Pin, RePin, typeof pins> {
  private static instance: PinSyncHandler | null = null;
  private imageSyncService: ImageSyncService<Pin, typeof pins>;

  private constructor(
    strategy: SyncStrategy<Pin, RePin>,
    localRepo: LocalRepository<Pin, typeof pins>,
    remoteRepo: RemoteRepository<RePin>
  ) {
    super(strategy, localRepo, remoteRepo);
    this.imageSyncService = new ImageSyncService(localRepo);
  }

  public static getInstance(
    strategy: SyncStrategy<Pin, RePin>,
    localRepo: LocalRepository<Pin, typeof pins>,
    remoteRepo: RemoteRepository<RePin>
  ) {
    if (!PinSyncHandler.instance) {
      PinSyncHandler.instance = new PinSyncHandler(strategy, localRepo, remoteRepo);
    }
    return PinSyncHandler.instance;
  }

  protected async postSync(syncedLocalItems: Pin[], syncedRemoteItems: RePin[]): Promise<void> {
    console.log('syncing pins');
    const incomingImages = syncedLocalItems.map((item) => ({
      id: item.id,
      images: item.images,
    }));

    const localImages = await this.imageSyncService.syncToLocal(incomingImages);
    await this.localRepo.updateFieldsBatch(localImages);
  }
}
