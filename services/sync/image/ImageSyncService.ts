import * as ImageManager from '~/services/sync/image/ImageManager';
import { LocalRepository } from '../implementations/LocalRepository';

export class ImageSyncService<LocalType extends { id: string }, Table extends Record<string, any>> {
  //pushing any image changes to remote

  constructor(private localRepo: LocalRepository<LocalType, Table>) {}
  async uploadToRemote(item: LocalType): Promise<string[]> {
    const localURIs = JSON.parse((item as any).localImages ?? '[]');
    const { uploaded } = await ImageManager.updateImagesRemotely((item as any).id, localURIs, []);
    return uploaded;
  }

  //no comparison logic, just directly uploads entire list of images
  async uploadToLocal(item: { id: string; images: string | null }): Promise<string[]> {
    const id: string = item.id;
    const existing_item = await this.localRepo.get(id);
    console.log('ok', existing_item);

    const remote: string[] = JSON.parse(item.images ?? '[]');
    const local = existing_item ? (existing_item as any).images : [];
    console.log('local,', local);
    console.log('remote,', remote);

    const { success } = await ImageManager.updateImagesLocally(item.id, remote, local);
    console.log('success', success);
    return success;
  }

  async syncToRemote(items: LocalType[]): Promise<void> {
    const updates: { id: string; fields: Partial<LocalType> }[] = [];

    for (const item of items) {
      const uploadedImages = await this.uploadToRemote(item);
      updates.push({
        id: (item as any).id,
        fields: {
          images: JSON.stringify(uploadedImages),
        } as any,
      });
    }
  }

  async syncToLocal(
    items: { id: string; images: string | null }[]
  ): Promise<{ id: string; fields: Partial<LocalType> }[]> {
    const updates: { id: string; fields: Partial<LocalType> }[] = [];

    for (const item of items) {
      const uploaded = await this.uploadToLocal(item);
      updates.push({
        id: item.id,
        fields: {
          localImages: JSON.stringify(uploaded),
        } as any,
      });
    }
    return updates;
  }
}
