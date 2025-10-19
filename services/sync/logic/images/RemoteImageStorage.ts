/**
 * Remote Image Storage Service
 *
 * Handles all remote storage operations (Supabase) for images.
 * Single Responsibility: Remote storage management
 *
 * Operations:
 * - Upload images to Supabase storage
 * - Delete images from Supabase storage
 * - List images in Supabase bucket
 *
 * Dependencies: Supabase storage API (injected via images module)
 */

import * as supabaseImageApi from './images';
import { extractFilename, normalizeFileUri, generateUniqueFilename } from './imageUtils';

export interface UploadResult {
  images: string[]; // Remote URLs
  localImages: string[]; // Original local URIs
  fail: { uri: string; error: unknown }[];
}

export interface DeleteResult {
  deleted: string[];
  failedDelete: { uri: string; error: unknown }[];
}

/**
 * Remote Image Storage Service
 * Manages images in Supabase storage bucket
 */
export class RemoteImageStorage {
  /**
   * Upload multiple images to remote storage
   *
   * @param pinId - Pin identifier (used for organizing in bucket)
   * @param localUris - Array of local image URIs to upload
   * @returns Upload results with remote URLs
   */
  async uploadImages(pinId: string, localUris: string[]): Promise<UploadResult> {
    const result: UploadResult = {
      images: [],
      localImages: [],
      fail: [],
    };

    if (!localUris?.length) {
      return result;
    }

    console.log(`Uploading ${localUris.length} images for pin ${pinId}`);

    // Create upload tasks for all images
    const uploadTasks = localUris.map((uri) => this.uploadSingleImage(pinId, uri));

    // Execute all uploads in parallel
    const results = await Promise.allSettled(uploadTasks);

    // Process results
    results.forEach((uploadResult, index) => {
      const localUri = localUris[index];

      if (uploadResult.status === 'fulfilled') {
        result.images.push(uploadResult.value); // Remote URL
        result.localImages.push(normalizeFileUri(localUri)); // Normalized local URI
      } else {
        result.fail.push({
          uri: localUri,
          error: uploadResult.reason,
        });
        console.warn(`Failed to upload ${localUri}:`, uploadResult.reason);
      }
    });

    console.log(`Upload complete: ${result.images.length} success, ${result.fail.length} failed`);
    return result;
  }

  /**
   * Upload a single image
   */
  private async uploadSingleImage(pinId: string, localUri: string): Promise<string> {
    // Extract filename from local URI, or generate new one
    const filename = extractFilename(localUri) ?? generateUniqueFilename();
    const remotePath = `${pinId}/${filename}`;

    // Ensure URI is properly formatted
    const normalizedUri = normalizeFileUri(localUri);

    // Upload to Supabase - pass pinId as entityId
    return await supabaseImageApi.uploadToRemote(normalizedUri, remotePath, pinId);
  }

  /**
   * Delete multiple images from remote storage
   *
   * @param pinId - Pin identifier
   * @param filenames - Array of filenames or URLs to delete
   * @returns Deletion results
   */
  async deleteImages(pinId: string, filenames: string[]): Promise<DeleteResult> {
    const result: DeleteResult = {
      deleted: [],
      failedDelete: [],
    };

    if (!filenames?.length) {
      return result;
    }

    console.log(`Deleting ${filenames.length} images for pin ${pinId}`);

    // Create delete tasks - pass imageUrl, entityType, and entityId
    const deleteTasks = filenames.map((imageUrl) =>
      supabaseImageApi.deleteImage(imageUrl, 'pin', pinId)
    );

    // Execute all deletions in parallel
    const results = await Promise.allSettled(deleteTasks);

    // Process results
    results.forEach((deleteResult, index) => {
      const imageUrl = filenames[index];

      if (deleteResult.status === 'fulfilled' && deleteResult.value) {
        result.deleted.push(imageUrl);
      } else {
        result.failedDelete.push({
          uri: imageUrl,
          error: deleteResult.status === 'rejected' ? deleteResult.reason : 'Unknown error',
        });
      }
    });

    console.log(
      `Delete complete: ${result.deleted.length} success, ${result.failedDelete.length} failed`
    );
    return result;
  }

  /**
   * List all images for a pin in remote storage
   *
   * @param pinId - Pin identifier
   * @returns Array of image URLs
   */
  async listImages(pinId: string): Promise<string[]> {
    try {
      return await supabaseImageApi.listFilesInBucket(pinId, 'pin');
    } catch (error) {
      console.warn(`Failed to list remote images for pin ${pinId}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const remoteImageStorage = new RemoteImageStorage();
