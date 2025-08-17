// PinSyncHandler.ts
import { pins } from '~/db/schema';
import { BaseSyncHandler } from './BaseSyncHandler';
import { Pin, RePin } from '~/utils/globalTypes';
import { SyncStrategy } from '../implementations/SyncStrategy';
import { LocalRepository } from '../implementations/LocalRepository';
import RemoteRepository from '../implementations/RemoteRepository';
import * as ImageManager from '~/services/sync/image/ImageManager';

export class PinSyncHandler extends BaseSyncHandler<Pin, RePin, typeof pins> {
  private static instance: PinSyncHandler | null = null;

  private constructor(
    strategy: SyncStrategy<Pin, RePin>,
    localRepo: LocalRepository<Pin, typeof pins>,
    remoteRepo: RemoteRepository<RePin>
  ) {
    super(strategy, localRepo, remoteRepo);
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

  protected async postSync(localUpserts: Pin[], remoteUpserts: RePin[]): Promise<void> {
    console.log(
      'syncing pin images...',
      'local:',
      localUpserts.length,
      'remote:',
      remoteUpserts.length
    );

    const localResults = await ImageManager.handleUpsertsToLocal(localUpserts);
    if (localResults.length > 0) {
      const updates = localResults.map(({ pinId, localImages, images }) => ({
        id: pinId,
        fields: {
          localImages: localImages ? JSON.stringify(localImages) : '[]',
          images: images ? JSON.stringify(images) : '[]',
        },
      }));
      await this.localRepo.updateFieldsBatch(updates); //updating local status
    }

    const remoteResults = await ImageManager.handleUpsertsToRemote(remoteUpserts);
    if (remoteResults && remoteResults.length > 0) {
      const updates = remoteResults.map(({ pinId, localImages, images }) => ({
        id: pinId,
        fields: {
          localImages: JSON.stringify(localImages),
          images: JSON.stringify(images),
        },
      }));
      await this.localRepo.updateFieldsBatch(updates); //updating local status
    }

    console.log('pin image sync complete.');
  }
}
