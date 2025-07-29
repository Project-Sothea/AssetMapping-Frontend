import * as ImageManager from '~/services/ImageManager';
import LocalRepository from './interfaces/LocalRepository';

export class ImageSyncService<LocalType> {
  //pushing any image changes to remote

  constructor(private localRepo: LocalRepository<LocalType>) {}
  async syncImageToRemote(item: LocalType): Promise<string[]> {
    const localURIs = JSON.parse((item as any).localImages ?? '[]');
    const { uploaded } = await ImageManager.updateImagesRemotely((item as any).id, localURIs, []);
    return uploaded;
  }

  //no comparison logic, just directly uploads entire list of images
  async syncRemoteImageToLocal(item: LocalType): Promise<string[]> {
    const id: string = (item as any).id;
    const existing_item = await this.localRepo.get(id);
    console.log('ok', existing_item);

    const remote: string[] = JSON.parse((item as any).images ?? '[]');
    const local = existing_item ? (existing_item as any).images : [];
    console.log('local,', local);
    console.log('remote,', remote);

    const { success } = await ImageManager.updateImagesLocally((item as any).id, remote, local);
    console.log('success', success);
    return success;
  }

  async syncImagesToRemote(items: LocalType[]): Promise<void> {
    const updates: { id: string; fields: Partial<LocalType> }[] = [];

    for (const item of items) {
      const uploaded = await this.syncImageToRemote(item);
      updates.push({
        id: (item as any).id,
        fields: {
          images: JSON.stringify(uploaded),
        } as any,
      });
    }
  }

  async syncRemoteImagesToLocal(
    items: LocalType[]
  ): Promise<{ id: string; fields: Partial<LocalType> }[]> {
    const updates: { id: string; fields: Partial<LocalType> }[] = [];

    for (const item of items) {
      const uploaded = await this.syncRemoteImageToLocal(item);
      updates.push({
        id: (item as any).id,
        fields: {
          localImages: JSON.stringify(uploaded),
        } as any,
      });
    }
    return updates;
  }
}
