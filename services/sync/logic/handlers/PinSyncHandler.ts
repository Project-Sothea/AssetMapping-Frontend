// PinSyncHandler.ts (moved)
import { pins } from '~/db/schema';
import { BaseSyncHandler } from '../BaseSyncHandler';
import { SyncStrategy } from '../syncing/SyncStrategy';
import { Pin, RePin } from '~/utils/globalTypes';
import { LocalRepository } from '../../repositories/LocalRepository';
import { RemoteRepository } from '../../repositories/RemoteRepository';
import {
  ImageManagerInterface,
  ImageUpsertLocalResult,
  ImageUpsertRemoteResult,
} from '../images/types';

export class PinSyncHandler extends BaseSyncHandler<Pin, RePin, typeof pins> {
  constructor(
    strategy: SyncStrategy<Pin, RePin>,
    localRepo: LocalRepository<Pin, typeof pins>,
    remoteRepo: RemoteRepository<RePin>,
    private imageManager: ImageManagerInterface
  ) {
    super(strategy, localRepo, remoteRepo);
  }

  protected async postSync(localUpserts: Pin[], remoteUpserts: RePin[]): Promise<void> {
    console.log(
      'syncing pin images...',
      'local:',
      localUpserts.length,
      'remote:',
      remoteUpserts.length
    );

    const localResults: ImageUpsertLocalResult[] =
      await this.imageManager.handleUpsertsToLocal(localUpserts);
    if (localResults.length > 0) {
      const updates = localResults.map((res: ImageUpsertLocalResult) => ({
        id: res.pinId,
        fields: {
          localImages: res.localImages ? JSON.stringify(res.localImages) : '[]',
          images: res.images ? JSON.stringify(res.images) : '[]',
        },
      }));

      await this.localRepo.updateFieldsBatch(updates);
    }

    const remoteImageFields: ImageUpsertRemoteResult[] =
      await this.imageManager.handleUpsertsToRemote(remoteUpserts);
    if (remoteImageFields && remoteImageFields.length > 0) {
      const localFieldUpdates = remoteImageFields.map((res: ImageUpsertRemoteResult) => ({
        id: res.pinId,
        fields: {
          localImages: JSON.stringify(res.localImages),
          images: JSON.stringify(res.images),
        },
      }));

      const remoteFieldUpdates = remoteImageFields.map((update: ImageUpsertRemoteResult) => ({
        id: update.pinId,
        images: update.images,
      }));
      await this.localRepo.updateFieldsBatch(localFieldUpdates);
      await this.remoteRepo.updateFieldsBatch(remoteFieldUpdates);
    }

    console.log('pin image sync complete.');
  }
}
