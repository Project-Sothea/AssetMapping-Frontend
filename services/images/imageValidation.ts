/**
 * Image Upload Coordination
 * Orchestrates validation and upload of images
 */

import { ImageManager } from './ImageManager';
import { validateFilesExist } from './imageStorage/fileSystemsUtils';
import { parseImageUris } from './utils/uriUtils';

export interface ImageUploadResult {
  remoteUrls: string[];
  validLocalUris: string[];
}

/**
 * Validate and upload images to backend
 * Returns both remote URLs and validated local URIs
 */
export async function validateAndUploadImages(
  pinId: string,
  localImages: string | string[] | undefined | null
): Promise<ImageUploadResult> {
  // Validate that files exist in storage
  /**
   * Validate images from JSON string or array
   * Returns only the URIs that exist on the filesystem
   */
  const uris = parseImageUris(localImages);
  const validUris = await validateFilesExist(uris);

  if (validUris.length === 0) {
    console.log('No valid images to upload');
    return { remoteUrls: [], validLocalUris: [] };
  }

  // Upload to backend
  try {
    console.log(`Uploading ${validUris.length} images...`);
    const remoteUrls = await ImageManager.uploadImages(pinId, validUris);
    return { remoteUrls, validLocalUris: validUris };
  } catch (error) {
    console.error('Failed to upload images:', error);
    // Return valid local URIs even if upload fails
    return { remoteUrls: [], validLocalUris: validUris };
  }
}
