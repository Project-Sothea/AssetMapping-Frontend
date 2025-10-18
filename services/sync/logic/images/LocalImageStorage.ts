/**
 * Local Image Storage Service
 *
 * Handles all local file system operations for images.
 * Single Responsibility: Local storage management
 *
 * Operations:
 * - Save images to device storage
 * - Update images (add new, remove old)
 * - Delete images
 * - List images for a pin
 * - Download remote images to local storage
 *
 * Dependencies: expo-file-system
 */

import * as FileSystem from 'expo-file-system';
import {
  generateUniqueFilename,
  normalizeFileUri,
  buildPinImageDirectory,
  isLocalUri,
  isRemoteUri,
} from './imageUtils';

export interface SaveResult {
  success: string[];
  fail: string[];
}

export interface UpdateResult {
  success: string[];
  fail: string[];
}

export interface DownloadResult {
  localImages: string[];
  images: string[];
  fail: string[];
}

/**
 * Local Image Storage Service
 * Manages image files in device file system
 */
export class LocalImageStorage {
  private readonly baseDirectory: string;

  constructor(baseDirectory: string = FileSystem.documentDirectory || '') {
    this.baseDirectory = baseDirectory;
  }

  /**
   * Get directory path for a specific pin
   */
  private getPinDirectory(pinId: string): string {
    return buildPinImageDirectory(this.baseDirectory, pinId);
  }

  /**
   * Ensure directory exists, create if necessary
   */
  private async ensureDirectory(directoryPath: string): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(directoryPath, { intermediates: true });
    } catch (error) {
      console.warn(`Failed to create directory ${directoryPath}:`, error);
      // Continue - makeDirectoryAsync is idempotent
    }
  }

  /**
   * Save images from gallery to local storage
   *
   * @param pinId - Pin identifier
   * @param imageUris - Array of image URIs from gallery
   * @returns Result with successful and failed saves
   */
  async saveImages(pinId: string, imageUris: string[]): Promise<SaveResult> {
    const result: SaveResult = { success: [], fail: [] };

    if (!imageUris?.length) {
      console.log('saveImages: No images to save');
      return result;
    }

    const directory = this.getPinDirectory(pinId);
    await this.ensureDirectory(directory);

    for (const uri of imageUris) {
      const filename = generateUniqueFilename();
      const localUri = `${directory}${filename}`;

      try {
        await FileSystem.copyAsync({ from: uri, to: localUri });
        result.success.push(localUri);
        console.log(`Saved image to: ${localUri}`);
      } catch (error) {
        console.warn(`Failed to save image ${uri}:`, error);
        result.fail.push(uri);
      }
    }

    return result;
  }

  /**
   * Update images: add new ones, remove old ones
   * Handles both local files and remote URLs (downloads them)
   *
   * @param pinId - Pin identifier
   * @param newImages - New image URIs (can be local or remote)
   * @param existingLocalUris - Currently stored local URIs
   * @returns Result with updated local URIs
   */
  async updateImages(
    pinId: string,
    newImages: string[],
    existingLocalUris: string[] = []
  ): Promise<UpdateResult> {
    const result: UpdateResult = { success: [], fail: [] };

    if (!newImages) {
      console.warn('updateImages: newImages is null or undefined');
      return result;
    }

    const directory = this.getPinDirectory(pinId);
    await this.ensureDirectory(directory);

    // Delete images that are no longer needed
    await this.removeUnusedImages(newImages, existingLocalUris);

    // Process each new image
    for (const imageUri of newImages) {
      // If already stored locally, keep it
      if (existingLocalUris.includes(imageUri)) {
        result.success.push(imageUri);
        continue;
      }

      // New image - save it locally
      try {
        const localUri = await this.saveNewImage(pinId, imageUri, directory);
        result.success.push(localUri);
      } catch (error) {
        console.warn(`Failed to save new image ${imageUri}:`, error);
        result.fail.push(imageUri);
      }
    }

    return result;
  }

  /**
   * Save a single new image (handles local copy or remote download)
   */
  private async saveNewImage(pinId: string, imageUri: string, directory: string): Promise<string> {
    const filename = generateUniqueFilename();
    const localUri = `${directory}${filename}`;

    if (isLocalUri(imageUri)) {
      // Copy local file
      await FileSystem.copyAsync({ from: imageUri, to: localUri });
    } else if (isRemoteUri(imageUri)) {
      // Download remote file
      const downloadRes = await FileSystem.downloadAsync(imageUri, localUri);
      if (downloadRes.status !== 200) {
        throw new Error(`Download failed: HTTP ${downloadRes.status}`);
      }
    } else {
      throw new Error(`Unsupported URI scheme: ${imageUri}`);
    }

    return localUri;
  }

  /**
   * Remove images that are no longer in the new set
   */
  private async removeUnusedImages(
    newImages: string[],
    existingLocalUris: string[]
  ): Promise<void> {
    const newUrisSet = new Set(newImages);
    const toDelete = existingLocalUris.filter((uri) => !newUrisSet.has(uri));

    console.log(`Deleting ${toDelete.length} unused images`);

    await Promise.all(
      toDelete.map(async (uri) => {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn(`Failed to delete image ${uri}:`, error);
        }
      })
    );
  }

  /**
   * List all images for a pin
   *
   * @param pinId - Pin identifier
   * @returns Array of local image URIs
   */
  async listImages(pinId: string): Promise<string[]> {
    const directory = this.getPinDirectory(pinId);

    try {
      const info = await FileSystem.getInfoAsync(directory);
      if (!info.exists) {
        return []; // Directory doesn't exist yet
      }

      const files = await FileSystem.readDirectoryAsync(directory);
      return files.map((filename) => normalizeFileUri(`${directory}${filename}`));
    } catch (error) {
      console.warn(`Failed to list images for pin ${pinId}:`, error);
      return [];
    }
  }

  /**
   * Delete all images for a pin
   *
   * @param pinId - Pin identifier
   * @param filenames - Specific filenames to delete (without directory path)
   * @returns Result with successful and failed deletions
   */
  async deleteImages(pinId: string, filenames: string[]): Promise<SaveResult> {
    const result: SaveResult = { success: [], fail: [] };

    if (!filenames?.length) {
      return result;
    }

    const directory = this.getPinDirectory(pinId);

    for (const filename of filenames) {
      const uri = `${directory}${filename}`;
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        result.success.push(uri);
      } catch (error) {
        console.warn(`Failed to delete ${uri}:`, error);
        result.fail.push(uri);
      }
    }

    // Try to clean up empty directory
    try {
      await FileSystem.deleteAsync(directory, { idempotent: true });
    } catch {
      // Ignore - directory might not be empty or might not exist
    }

    return result;
  }

  /**
   * Download remote images to local storage
   * Used during sync to cache remote images locally
   *
   * @param pinId - Pin identifier
   * @param remoteUrls - Array of remote image URLs
   * @returns Downloaded images info
   */
  async downloadImages(pinId: string, remoteUrls: string[]): Promise<DownloadResult> {
    const result: DownloadResult = {
      localImages: [],
      images: remoteUrls,
      fail: [],
    };

    if (!remoteUrls?.length) {
      console.log(`downloadImages: No images to download for pin ${pinId}`);
      return result;
    }

    console.log(`Downloading ${remoteUrls.length} images for pin ${pinId}`);

    const directory = this.getPinDirectory(pinId);
    await this.ensureDirectory(directory);

    for (const remoteUrl of remoteUrls) {
      try {
        const localUri = await this.downloadSingleImage(remoteUrl, directory);
        result.localImages.push(localUri);
        console.log(`Downloaded: ${remoteUrl} → ${localUri}`);
      } catch (error) {
        console.warn(`Failed to download ${remoteUrl}:`, error);
        result.fail.push(remoteUrl);
      }
    }

    console.log(
      `Download complete: ${result.localImages.length} success, ${result.fail.length} failed`
    );
    return result;
  }

  /**
   * Download a single image
   */
  private async downloadSingleImage(remoteUrl: string, directory: string): Promise<string> {
    const filename = generateUniqueFilename();
    const localUri = `${directory}${filename}`;

    if (isLocalUri(remoteUrl)) {
      // Already local - just copy
      await FileSystem.copyAsync({ from: remoteUrl, to: localUri });
    } else if (isRemoteUri(remoteUrl)) {
      // Download from remote
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
      if (downloadRes.status !== 200) {
        throw new Error(`Download failed: HTTP ${downloadRes.status}`);
      }
    } else {
      throw new Error(`Unsupported image source: ${remoteUrl}`);
    }

    return normalizeFileUri(localUri);
  }
}

// Singleton instance
export const localImageStorage = new LocalImageStorage();
