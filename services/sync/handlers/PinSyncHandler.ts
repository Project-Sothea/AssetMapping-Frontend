// PinSyncHandler.ts
import { pins } from '~/db/schema';
import { BaseSyncHandler } from './BaseSyncHandler';
import { Pin, RePin } from '~/utils/globalTypes';
import { SyncStrategy } from '../implementations/SyncStrategy';
import { LocalRepository } from '../implementations/LocalRepository';
import RemoteRepository from '../implementations/RemoteRepository';
import { ImageSyncService } from '../image/ImageSyncService';
import * as ImageManager from '~/services/sync/image/ImageManager';

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

  protected async postSync(localUpserts: Pin[], remoteUpserts: RePin[]): Promise<void> {
    console.log('syncing pin images...');

    const localResults = await ImageManager.handleUpsertsToLocal(localUpserts);
    if (localResults.length > 0) {
      const updates = localResults.map(({ pinId, localImages, images }) => ({
        id: pinId,
        fields: {
          localImages: localImages ? JSON.stringify(localImages) : '[]',
          images: images ? JSON.stringify(images) : '[]',
        },
      }));
      await this.localRepo.updateFieldsBatch(updates);
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
      await this.localRepo.updateFieldsBatch(updates);
    }

    console.log('pin image sync complete.');
  }

  // private async handleImageUploads(remoteUpserts: RePin[]) {
  //   const uploadTasks = remoteUpserts.map(async (pin) => {
  //     const parsedLocalImages = this.parseLocalImages(pin.local_images);

  //     if (parsedLocalImages.length > 0 && (!pin.images || pin.images.length === 0)) {
  //       const { success: publicURIs } = await ImageManager.saveToRemote(pin.id, parsedLocalImages);
  //       return { id: pin.id, fields: { images: JSON.stringify(publicURIs) } };
  //     }
  //     return null;
  //   });

  //   const uploadedImages = (await Promise.all(uploadTasks)).filter(Boolean);
  //   if (uploadedImages.length > 0) {
  //     await this.localRepo.updateFieldsBatch(uploadedImages as any);
  //   }
  // }

  // private async handleImageUpdates(localUpserts: Pin[], remoteUpserts: RePin[]) {
  //   const remoteTasks = remoteUpserts.map(async (pin) => {
  //     const parsedLocalImages = this.parseLocalImages(pin.local_images);
  //     const currImages = pin.images ? pin.images : [];

  //     if (parsedLocalImages.length > 0 && currImages.length > 0) {
  //       const { uploaded: publicURIs } = await ImageManager.updateImagesRemotely(
  //         pin.id,
  //         parsedLocalImages,
  //         currImages
  //       );
  //       return { id: pin.id, fields: { images: JSON.stringify(publicURIs) } };
  //     }
  //     return null;
  //   });

  //   const localTasks = localUpserts.map(async (pin) => {
  //     const parsedLocalImages = this.parseLocalImages(pin.localImages);
  //     const currImages: string[] = pin.localImages ? JSON.parse(pin.localImages) : [];

  //     if (parsedLocalImages.length > 0 && currImages.length > 0) {
  //       const { success: publicURIs } = await ImageManager.updateImagesLocally(
  //         pin.id,
  //         parsedLocalImages,
  //         currImages
  //       );
  //       return { id: pin.id, fields: { images: JSON.stringify(publicURIs) } };
  //     }
  //     return null;
  //   });

  //   const tasks = [...localTasks, ...remoteTasks];

  //   const updatedImages = (await Promise.all(tasks)).filter(Boolean);
  //   if (updatedImages.length > 0) {
  //     await this.localRepo.updateFieldsBatch(updatedImages as any);
  //   }
  // }

  // private async handleImageDeletions(localUpserts: Pin[], remoteUpserts: RePin[]) {
  //   const localTasks = localUpserts.map(async (pin) => {
  //     if (pin.deletedAt) {
  //       await ImageManager.deleteAllImagesLocally(pin.id);
  //       return { id: pin.id, fields: { localImages: JSON.stringify([]) } };
  //     }
  //     return null;
  //   });

  //   const remoteTasks = remoteUpserts.map(async (pin) => {
  //     if (pin.deleted_at) {
  //       await ImageManager.deleteAllImagesRemotely(pin.id);
  //       return { id: pin.id, fields: { localImages: JSON.stringify([]) } };
  //     }
  //     return null;
  //   });

  //   const tasks = [...localTasks, ...remoteTasks];

  //   const deleted = (await Promise.all(tasks)).filter(Boolean);
  //   if (deleted.length > 0) {
  //     await this.localRepo.updateFieldsBatch(deleted as any);
  //   }
  // }

  // private async handleImageDownloads(localUpserts: Pin[]) {
  //   const incomingImages = localUpserts.map((item) => ({
  //     id: item.id,
  //     images: item.images,
  //   }));

  //   const localImages = await this.imageSyncService.syncToLocal(incomingImages);
  //   if (localImages.length > 0) {
  //     await this.localRepo.updateFieldsBatch(localImages);
  //   }
  // }

  // private parseLocalImages(local_images: string[] | string | null): string[] {
  //   if (Array.isArray(local_images)) return local_images;
  //   if (typeof local_images === 'string' && local_images.trim() !== '') {
  //     try {
  //       return JSON.parse(local_images);
  //     } catch (e) {
  //       console.warn('Failed to parse local_images', local_images, e);
  //     }
  //   }
  //   return [];
  // }
}
