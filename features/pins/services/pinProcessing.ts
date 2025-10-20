import { ImageManager } from '~/services/images/ImageManager';
import { parseImageUris, areImagesEqual, extractFilenames } from '~/services/images/utils/uriUtils';
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

/**
 * Update pin images when editing a pin.
 * Handles three scenarios:
 * 1. No changes to images - keep as is
 * 2. Images added/removed - incremental update
 * 3. All images removed - delete all
 */
export async function updatePinImages(existingPin: Pin, updates: Partial<Pin>): Promise<Pin> {
  const existingUris = parseImageUris(existingPin.localImages);

  // If localImages is not being updated, keep everything unchanged
  if (updates.localImages === undefined) {
    return { ...existingPin, ...updates };
  }

  const newUris = parseImageUris(updates.localImages);

  // If images haven't changed, skip image processing
  if (areImagesEqual(existingUris, newUris)) {
    return {
      ...existingPin,
      ...updates,
      localImages: existingPin.localImages,
    };
  }

  // Images have changed - process the update
  const updatedPin = { ...existingPin, ...updates };

  // Handle complete removal
  if (existingUris.length === 0 && newUris.length === 0) {
    await deleteAllImages(existingPin.id, existingUris);
    return { ...updatedPin, localImages: '[]', images: null };
  }

  // Handle incremental update (add/remove specific images)
  const finalUris = await processIncrementalImageUpdate(
    existingPin.id,
    updatedPin.id,
    existingUris,
    newUris
  );

  return { ...updatedPin, localImages: JSON.stringify(finalUris), images: null };
}

// ========== Helper Functions ==========

/**
 * Delete all images for a pin
 */
async function deleteAllImages(pinId: string, imageUris: string[]): Promise<void> {
  if (imageUris.length === 0) return;

  const filenames = extractFilenames(imageUris);
  await ImageManager.deleteImages(pinId, filenames);
}

/**
 * Process incremental image update (delete removed, keep existing, add new)
 */
async function processIncrementalImageUpdate(
  existingPinId: string,
  updatedPinId: string,
  existingUris: string[],
  newUris: string[]
): Promise<string[]> {
  // Calculate what changed
  const urisToDelete = existingUris.filter((uri) => !newUris.includes(uri));
  const urisToAdd = newUris.filter((uri) => !existingUris.includes(uri));

  console.log('📊 Image Update:');
  console.log('  Before:', existingUris);
  console.log('  After:', newUris);
  console.log('  → Delete:', urisToDelete);
  console.log('  → Add:', urisToAdd);

  // Delete removed images
  if (urisToDelete.length > 0) {
    try {
      const filenames = extractFilenames(urisToDelete);
      await ImageManager.deleteImages(existingPinId, filenames);
      console.log('  ✓ Deleted:', filenames);
    } catch (error) {
      console.error('  ✗ Delete failed:', error);
      // Continue - deletion failure shouldn't break the update
    }
  }

  // Keep images that weren't deleted
  const keptUris = existingUris.filter((uri) => !urisToDelete.includes(uri));
  let finalUris = [...keptUris];

  // Save new images
  if (urisToAdd.length > 0) {
    try {
      const { success: savedUris } = await ImageManager.saveImages(updatedPinId, urisToAdd);
      finalUris = [...finalUris, ...savedUris];
      console.log('  ✓ Added:', savedUris);
    } catch (error) {
      console.error('  ✗ Save failed:', error);
      // Keep existing images even if save fails
    }
  }

  console.log('  ✅ Final:', finalUris);
  return finalUris;
}
