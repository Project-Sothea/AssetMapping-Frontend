/**
 * ImageManager.ts
 * Facade that provides a simple, high-level API for all image operations.
 */

import { pickImage } from './imagePicker/ImagePicker';
import * as ImageStorage from './imageStorage/ImageStorage';
import { imageUpload } from './imageUpload/ImageUpload';

/**
 * Download remote images for offline use with error handling and logging
 * Returns local file paths for successfully downloaded images
 */
async function downloadRemoteImages(entityId: string, remoteUrls: string[]): Promise<string[]> {
  if (remoteUrls.length === 0) {
    return [];
  }

  try {
    const result = await ImageStorage.saveNewImages(entityId, remoteUrls);

    if (result.fail.length > 0) {
      console.warn(
        `⚠️ Entity ${entityId}: Failed to download ${result.fail.length}/${remoteUrls.length} images`
      );
    }

    return result.success;
  } catch (error) {
    console.error(`❌ Entity ${entityId}: Failed to download images:`, error);
    // Return empty array on failure - sync can continue without images
    return [];
  }
}

export const ImageManager = {
  pick: pickImage,
  saveImages: ImageStorage.saveNewImages,
  deleteImages: ImageStorage.deleteImages,
  uploadImages: imageUpload,
  downloadRemoteImages,
};

export default ImageManager;
