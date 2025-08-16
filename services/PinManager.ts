import { PinFormValues } from '~/components/PinForm';
import * as ImageManager from '~/services/sync/image/ImageManager';
import { db } from './drizzleDb';
import { Pin, pins } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { EntityManager } from './EntityManager';
import { DrizzlePinRepo } from './sync/implementations/pins/DrizzlePinRepo';
import { getCurrentTimeStamp } from '~/utils/getCurrentTimeStamp';
import { pinSyncManager } from './sync/syncManagerInstance';

export class PinManager implements EntityManager<PinFormValues, PinFormValues, Pin> {
  constructor(private readonly localRepo: DrizzlePinRepo) {}

  public async createLocally(data: PinFormValues): Promise<void> {
    const pinId = data.id;
    const now = getCurrentTimeStamp();

    // Save to local filesystem
    const { success: localURIs } = await ImageManager.saveToFileSystem(pinId, data.localImages);
    console.log('createLocally: localURIs', localURIs);

    const dirtyPin: Pin = {
      ...data,
      localImages: JSON.stringify(localURIs),
      images: null,
      status: 'dirty',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
      lastFailedSyncAt: null,
      failureReason: null,
    };

    // Save to local DB
    await this.localRepo.create(dirtyPin);

    // Upload to remote (Supabase)
    const { success: publicURIs } = await ImageManager.saveToRemote(pinId, localURIs);
    console.log('success', publicURIs);

    await pinSyncManager.setlocalImagesField([
      { id: pinId, fields: { images: JSON.stringify(publicURIs) } },
    ]);
  }

  // Update remote image URLs in local DB
  async updateLocally(data: PinFormValues): Promise<void> {
    const pinId = data.id;
    const currPin = await this.localRepo.get(pinId);
    const currLocalImages: string[] = currPin.localImages ? JSON.parse(currPin.localImages) : [];

    const { success: localImages } = await ImageManager.updateImagesLocally(
      pinId,
      data.localImages,
      currLocalImages
    );

    const now = new Date().toISOString();

    const dirtyPin = {
      ...currPin,
      ...data,
      localImages: JSON.stringify(localImages),
      status: 'dirty',
      updatedAt: now,
    };
    await this.localRepo.upsert(dirtyPin);

    //remote image sync
    const currImages: string[] = currPin.images ? JSON.parse(currPin.images) : [];

    const { uploaded: publicURIs } = await ImageManager.updateImagesRemotely(
      pinId,
      localImages,
      currImages
    );
    console.log('publicURIs', publicURIs);
    await setImagesFieldLocally(publicURIs, pinId);
  }

  async deleteLocally(pin: Pin): Promise<void> {
    const pinId = pin.id;

    await ImageManager.deleteAllImagesLocally(pinId);
    await this.localRepo.delete(pinId); // this sets "deletedAt" to now()

    const publicImages = pin.images ? JSON.parse(pin.images) : [];
    await ImageManager.deleteAllImagesRemotely(pinId, publicImages);
  }
}

export type pinCreationData = PinFormValues;

const setImagesFieldLocally = async (images: string[], pinId: string) => {
  const stringified = JSON.stringify(images);
  await db
    .update(pins)
    .set({
      images: stringified,
    })
    .where(eq(pins.id, pinId));

  const updated = await db.select().from(pins).where(eq(pins.id, pinId));
  console.log('Updated row:', updated[0].images);
};
