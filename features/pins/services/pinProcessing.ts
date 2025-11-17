import { ImageManager } from '~/services/images/ImageManager';
import { parseImageUris, areUrisEqual } from '~/services/images/utils/uriUtils';
import type { Pin } from '~/db/schema';
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
  const localImagesArray = pin.localImages ? JSON.parse(pin.localImages) : [];
  if (localImagesArray.length > 0) {
    const { success: localURIs } = await ImageManager.saveImages(pin.id, localImagesArray);
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
  if (areUrisEqual(existingUris, newUris)) {
    return {
      ...existingPin,
      ...updates,
      localImages: existingPin.localImages,
    };
  }

  // Images have changed - process the update
  const updatedPin = { ...existingPin, ...updates };

  // Handle complete removal - clear both local and remote images
  if (newUris.length === 0) {
    console.log('Removing all images, deleting: ', existingUris);
    await ImageManager.deleteImages(existingUris);
    return { ...updatedPin, localImages: '[]', images: '[]' }; // Empty array, not null
  }

  // Handle incremental update (add/remove specific images)
  const { finalLocalUris, finalRemoteUrls } = await processIncrementalImageUpdate(
    updatedPin.id,
    existingUris,
    newUris,
    parseImageUris(existingPin.images)
  );

  return {
    ...updatedPin,
    localImages: JSON.stringify(finalLocalUris),
    images: JSON.stringify(finalRemoteUrls),
  };
}

// ========== Helper Functions ==========
/**
 * Process incremental image update (delete removed, keep existing, add new)
 * Also tracks which remote URLs should be kept after deletions
 */
async function processIncrementalImageUpdate(
  updatedPinId: string,
  existingLocalUris: string[],
  newLocalUris: string[],
  existingRemoteUrls: string[]
): Promise<{ finalLocalUris: string[]; finalRemoteUrls: string[] }> {
  // Calculate what changed in local images
  const localUrisToDelete = existingLocalUris.filter((uri) => !newLocalUris.includes(uri));
  const localUrisToAdd = newLocalUris.filter((uri) => !existingLocalUris.includes(uri));

  // Delete removed images from local storage
  if (localUrisToDelete.length > 0) {
    try {
      await ImageManager.deleteImages(localUrisToDelete);
      console.log('  ✓ Deleted:', localUrisToDelete);
    } catch (error) {
      console.error('  ✗ Delete failed:', error);
      // Continue - deletion failure shouldn't break the update
    }
  }

  // Keep local images that weren't deleted
  const keptLocalUris = existingLocalUris.filter((uri) => !localUrisToDelete.includes(uri));
  let finalLocalUris = [...keptLocalUris];

  // Save new images to local storage
  if (localUrisToAdd.length > 0) {
    try {
      const { success: savedUris } = await ImageManager.saveImages(updatedPinId, localUrisToAdd);
      finalLocalUris = [...finalLocalUris, ...savedUris];
      console.log('  ✓ Added:', savedUris);
    } catch (error) {
      console.error('  ✗ Save failed:', error);
      // Keep existing images even if save fails
    }
  }

  // Also update remote URLs - remove URLs at the same positions as deleted local images
  // Map each existing local URI to its index, then determine which remote URLs to keep
  const deletedIndices = new Set<number>();
  existingLocalUris.forEach((uri, index) => {
    if (localUrisToDelete.includes(uri)) {
      deletedIndices.add(index);
    }
  });

  // Keep remote URLs whose corresponding local image wasn't deleted
  const finalRemoteUrls = existingRemoteUrls.filter((_, index) => !deletedIndices.has(index));

  console.log('  ✅ Final local:', finalLocalUris);
  console.log('  ✅ Final remote:', finalRemoteUrls);
  console.log('  📍 Deleted indices:', Array.from(deletedIndices));

  return { finalLocalUris, finalRemoteUrls };
}
