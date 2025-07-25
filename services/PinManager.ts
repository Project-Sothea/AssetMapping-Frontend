import { PinFormValues } from '~/components/PinForm';
import * as ImageManager from '~/services/ImageManager';
import { db } from './drizzleDb';
import { Pin, pins } from '~/db/schema';
import { callPin } from '~/apis';
import { eq, sql } from 'drizzle-orm';

export type pinCreationData = PinFormValues;

export const createPin = async (data: pinCreationData) => {
  try {
    //Step 1.1: Save images locally
    const { success: localURIs } = await ImageManager.saveImagesLocally(data.id, data.localImages);

    //Step 1.2: Upload (dirty) pin locally
    const now = new Date().toISOString();
    const dirtyPin = {
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
    await insertPinLocally(dirtyPin);

    //Step 2.1: upload image online
    const { success: publicURIs } = await ImageManager.saveImagesRemotely(data.id, localURIs);
    await setImagesFieldLocally(publicURIs, data.id);

    //Step 2.2: insert pin remotely
    const remotePin = {
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      type: data.type,
      description: data.description,
      country: data.country,
      address: data.address,
      postal_code: data.postalCode,
      state_province: data.stateProvince,
      id: data.id,
      images: publicURIs,
    };
    await callPin.create(remotePin);

    //Step 3: clean pin locally
    await markAsSynced(data.id);
  } catch (e) {
    console.error(e);
    throw new Error('Error creating pin');
  }
};

export const updatePin = async (data: PinFormValues) => {
  try {
    const pinId = data.id;
    //Step 1.1: Update images locally
    const currPin = await getLocalPin(pinId);
    const currLocalImages: string[] = currPin.localImages ? JSON.parse(currPin.localImages) : [];

    const { success: localURIs } = await ImageManager.updateImagesLocally(
      pinId,
      data.localImages,
      currLocalImages
    );

    //Step 1.2: Update pin locally
    const now = new Date().toISOString();
    const dirtyPin = {
      ...currPin,
      ...data,
      localImages: JSON.stringify(localURIs),
      images: null,
      status: 'dirty',
      updatedAt: now,
    };
    await upsertPinLocally(dirtyPin);

    //update images online
    const currImages: string[] = currPin.images ? JSON.parse(currPin.images) : [];

    const { uploaded: publicURIs } = await ImageManager.updateImagesRemotely(
      pinId,
      localURIs,
      currImages
    );
    await setImagesFieldLocally(publicURIs, pinId);

    //update pins remotely
    const remotePin = {
      name: dirtyPin.name,
      lat: dirtyPin.lat,
      lng: dirtyPin.lng,
      type: dirtyPin.type,
      description: dirtyPin.description,
      country: dirtyPin.country,
      address: dirtyPin.address,
      postal_code: dirtyPin.postalCode,
      state_province: dirtyPin.stateProvince,
      id: dirtyPin.id,
      images: publicURIs,
    };

    await callPin.update(remotePin);

    //clean pin locally
    await markAsSynced(data.id);
  } catch (e) {
    console.error(e);
    throw new Error('Error updating pin');
  }
};

const insertPinLocally = async (pin: Pin) => {
  try {
    const localPin = await db.insert(pins).values(pin).returning();
    return localPin;
  } catch (e) {
    console.error('Failed to insert pin:', e);
    throw new Error('Error creating pin locally');
  }
};

const upsertPinLocally = async (pin: Pin) => {
  try {
    await db
      .insert(pins)
      .values(pin)
      .onConflictDoUpdate({
        target: pins.id,
        set: { ...pin },
        setWhere: sql`${pin.updatedAt} > ${pins.updatedAt}`,
      })
      .returning({ id: pins.id });
  } catch (e) {
    console.error('Failed to insert pin:', e);
    throw new Error('Error creating pin locally');
  }
};

export const getLocalPin = async (pinId: string) => {
  try {
    const localPin = await db.select().from(pins).where(eq(pins.id, pinId)).limit(1);
    return localPin[0];
  } catch (e) {
    console.error('Failed to get pin:', e);
    throw new Error('Error fetching pin locally');
  }
};
const markAsSynced = async (pinId: string) => {
  await db
    .update(pins)
    .set({
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
      lastFailedSyncAt: null,
      failureReason: null, // clear any previous error
    })
    .where(eq(pins.id, pinId));
};

const setImagesFieldLocally = async (images: string[], pinId: string) => {
  const stringified = JSON.stringify(images);

  await db
    .update(pins)
    .set({
      images: stringified,
    })
    .where(eq(pins.id, pinId));
};
