import { ImageManager } from '~/services/images/ImageManager';
import { Pin } from '~/db/types';
import { v4 as uuidv4 } from 'uuid';

export async function preparePinForInsertion(pin: Omit<Pin, 'id'>): Promise<Pin> {
  const pinId = uuidv4();
  const pinWithId = {
    ...pin,
    id: pinId,
    status: pin.status || 'unsynced', // Default to unsynced for new pins
  };
  return pinWithId;
}

export async function savePinImages(pin: Pin): Promise<Pin> {
  if (pin.localImages?.length) {
    const { success: localURIs } = await ImageManager.saveImages(pin.id, pin.localImages);
    return { ...pin, localImages: JSON.stringify(localURIs), images: null };
  }
  return { ...pin, localImages: '[]', images: null };
}

export async function updatePinImages(existingPin: Pin, updates: Partial<Pin>): Promise<Pin> {
  console.log(updates);
  const updatedPin = { ...existingPin, ...updates };

  //if there are updates for localImages
  if (updates.localImages !== undefined) {
    let existingLocalUris: string[] = [];
    try {
      existingLocalUris = existingPin.localImages ? JSON.parse(existingPin.localImages) : [];
    } catch {
      existingLocalUris = [];
    }

    //updated and no more images
    if (!updatedPin.localImages?.length) {
      await ImageManager.deleteImages(existingPin.id, existingLocalUris);
      return { ...updatedPin, localImages: '[]', images: null };
    }

    //if updated and still have images
    await ImageManager.deleteImages(existingPin.id, existingLocalUris);
    const { success: localURIs } = await ImageManager.saveImages(
      updatedPin.id,
      updatedPin.localImages
    );
    return { ...updatedPin, localImages: JSON.stringify(localURIs), images: null };
  }

  return updatedPin;
}
