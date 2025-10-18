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

    // Upload to Supabase
    return await supabaseImageApi.uploadToRemote(normalizedUri, remotePath);
  }

  /**
   * Delete images from remote storage
   *
   * @param pinId - Pin identifier
   * @param filenames - Array of filenames to delete (without pinId prefix)
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

    // Create delete tasks
    const deleteTasks = filenames.map((filename) =>
      supabaseImageApi.deleteImage(`${pinId}/${filename}`)
    );

    // Execute all deletions in parallel
    const results = await Promise.allSettled(deleteTasks);

    // Process results
    results.forEach((deleteResult, index) => {
      const fullPath = `${pinId}/${filenames[index]}`;

      if (deleteResult.status === 'fulfilled') {
        result.deleted.push(fullPath);
      } else {
        result.failedDelete.push({
          uri: fullPath,
          error: deleteResult.reason,
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
   * @returns Array of filenames (without pinId prefix)
   */
  async listImages(pinId: string): Promise<string[]> {
    try {
      return await supabaseImageApi.listFilesInBucket(`${pinId}/`);
    } catch (error) {
      console.warn(`Failed to list remote images for pin ${pinId}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const remoteImageStorage = new RemoteImageStorage();
