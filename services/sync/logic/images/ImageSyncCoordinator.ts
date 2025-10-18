/**
 * Image Sync Coordinator
 *
 * Orchestrates image synchronization between local and remote storage.
 * Single Responsibility: Coordinate sync operations
 *
 * This is the HIGH-LEVEL orchestrator that:
 * - Coordinates local storage and remote storage services
 * - Handles sync logic for pins
 * - Manages the flow: fetch old → delete old → upload/download new
 *
 * Dependencies: LocalImageStorage, RemoteImageStorage
 */

import { LocalImageStorage, localImageStorage } from './LocalImageStorage';
import { RemoteImageStorage, remoteImageStorage } from './RemoteImageStorage';
import { Pin, RePin } from '~/utils/globalTypes';

export interface ImageSyncResult {
  pinId: string;
  localImages: string[];
  images: string[];
}

/**
 * Image Sync Coordinator
 * High-level orchestration of image sync operations
 */
export class ImageSyncCoordinator {
  constructor(
    private localStorage: LocalImageStorage = localImageStorage,
    private remoteStorage: RemoteImageStorage = remoteImageStorage
  ) {}

  /**
   * Sync images TO LOCAL storage
   * Used when pulling data from remote to local
   *
   * Flow:
   * 1. List current local images
   * 2. Delete all old local images
   * 3. Download new images from remote URLs
   *
   * @param pins - Pins to sync (from remote source)
   * @returns Array of sync results with updated local paths
   */
  async syncToLocal(pins: Pin[]): Promise<ImageSyncResult[]> {
    if (!pins?.length) {
      return [];
    }

    console.log(`Syncing ${pins.length} pins TO LOCAL storage`);

    const results: ImageSyncResult[] = [];

    for (const pin of pins) {
      try {
        const result = await this.syncPinToLocal(pin);
        results.push(result);
      } catch (error) {
        console.error(`Failed to sync pin ${pin.id} to local:`, error);
        // Continue with other pins
      }
    }

    return results;
  }

  /**
   * Sync a single pin to local storage
   */
  private async syncPinToLocal(pin: Pin): Promise<ImageSyncResult> {
    // Step 1: Get current local images
    const oldLocalImages = await this.localStorage.listImages(pin.id);

    // Step 2: Parse remote URLs from pin data
    const remoteUrls = this.parseImageArray(pin.images);

    // Step 3: Delete old local images
    if (oldLocalImages.length > 0) {
      await this.localStorage.deleteImages(
        pin.id,
        oldLocalImages.map((uri) => uri.split('/').pop() || '')
      );
    }

    // Step 4: Download new images
    const { localImages, images } = await this.localStorage.downloadImages(pin.id, remoteUrls);

    return {
      pinId: pin.id,
      localImages,
      images,
    };
  }

  /**
   * Sync images TO REMOTE storage
   * Used when pushing data from local to remote
   *
   * Flow:
   * 1. List current remote images
   * 2. Delete all old remote images
   * 3. Upload new images from local URIs
   *
   * @param pins - Pins to sync (from local source)
   * @returns Array of sync results with remote URLs
   */
  async syncToRemote(pins: RePin[]): Promise<ImageSyncResult[]> {
    if (!pins?.length) {
      return [];
    }

    console.log(`Syncing ${pins.length} pins TO REMOTE storage`);

    const results: ImageSyncResult[] = [];

    for (const pin of pins) {
      try {
        const result = await this.syncPinToRemote(pin);
        results.push(result);
      } catch (error) {
        console.error(`Failed to sync pin ${pin.id} to remote:`, error);
        // Continue with other pins
      }
    }

    return results;
  }

  /**
   * Sync a single pin to remote storage
   */
  private async syncPinToRemote(pin: any): Promise<ImageSyncResult> {
    // Step 1: Get current remote images
    const oldRemoteFiles = await this.remoteStorage.listImages(pin.id);

    // Step 2: Parse local URIs from pin data (localImages field exists on local Pin type)
    const localUris = this.parseImageArray(pin.localImages || pin.local_images);

    // Step 3: Delete old remote images
    if (oldRemoteFiles.length > 0) {
      await this.remoteStorage.deleteImages(pin.id, oldRemoteFiles);
    }

    // Step 4: Upload new images
    const { localImages, images } = await this.remoteStorage.uploadImages(pin.id, localUris);

    return {
      pinId: pin.id,
      localImages,
      images,
    };
  }

  /**
   * Parse image array from various formats
   * Handles JSON strings, arrays, null, etc.
   *
   * @param images - Images in various formats (string, array, null)
   * @returns Parsed array of image URIs
   */
  private parseImageArray(images: any): string[] {
    // Handle JSON string
    if (typeof images === 'string' && images.trim() !== '') {
      try {
        return JSON.parse(images);
      } catch {
        console.warn('Failed to parse images JSON string');
        return [];
      }
    }

    // Handle array
    if (Array.isArray(images)) {
      return images;
    }

    // Handle null/undefined
    return [];
  }
}

// Singleton instance
export const imageSyncCoordinator = new ImageSyncCoordinator();
