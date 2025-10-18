/**
 * Image Manager - Refactored
 *
 * Public API for image operations.
 * This module provides a clean, high-level interface for all image-related operations.
 *
 * Architecture:
 * - ImagePickerService: Handles user image selection
 * - LocalImageStorage: Manages local file system operations
 * - RemoteImageStorage: Manages Supabase storage operations
 * - ImageSyncCoordinator: Orchestrates sync between local and remote
 *
 * This file serves as the FACADE pattern - simple public API delegating to specialized services.
 */

import { imagePickerService, ImagePickResult } from './ImagePickerService';
import { localImageStorage, SaveResult, UpdateResult } from './LocalImageStorage';
import { remoteImageStorage, UploadResult } from './RemoteImageStorage';
import { imageSyncCoordinator, ImageSyncResult } from './ImageSyncCoordinator';
import { Pin } from '~/utils/globalTypes';

// ==================== Public API ====================

/**
 * Pick an image from device gallery
 * @returns Result with image URI or error
 */
export async function getPickedImage(): Promise<ImagePickResult> {
  return imagePickerService.pickImage();
}

/**
 * Save images from gallery to local storage
 * @param pinId - Pin identifier
 * @param images - Array of image URIs from gallery
 * @returns Save result
 */
export async function saveToFileSystem(pinId: string, images: string[]): Promise<SaveResult> {
  return localImageStorage.saveImages(pinId, images);
}

/**
 * Update images locally - add new, remove old
 * Handles both local files and remote URLs
 *
 * @param pinId - Pin identifier
 * @param newImages - New image URIs (local or remote)
 * @param existingLocalUris - Currently stored local URIs
 * @returns Update result
 */
export async function updateImagesLocally(
  pinId: string,
  newImages: string[] = [],
  existingLocalUris: string[] = []
): Promise<UpdateResult> {
  return localImageStorage.updateImages(pinId, newImages, existingLocalUris);
}

/**
 * Upload images to remote storage (Supabase)
 * @param pinId - Pin identifier
 * @param uris - Local image URIs to upload
 * @returns Upload result with remote URLs
 */
export async function uploadToRemote(pinId: string, uris: string[]): Promise<UploadResult> {
  return remoteImageStorage.uploadImages(pinId, uris);
}

/**
 * Sync images TO LOCAL storage (remote → local)
 * Used when pulling data from remote database
 *
 * @param localUpserts - Pins from remote to sync locally
 * @returns Array of sync results
 */
export async function handleUpsertsToLocal(localUpserts: Pin[]): Promise<ImageSyncResult[]> {
  return imageSyncCoordinator.syncToLocal(localUpserts);
}

/**
 * Sync images TO REMOTE storage (local → remote)
 * Used when pushing data to remote database
 *
 * @param remoteUpserts - Pins from local to sync remotely
 * @returns Array of sync results
 */
export async function handleUpsertsToRemote(remoteUpserts: any[]): Promise<ImageSyncResult[]> {
  return imageSyncCoordinator.syncToRemote(remoteUpserts);
}

// ==================== Default Export ====================

export default {
  getPickedImage,
  saveToFileSystem,
  updateImagesLocally,
  uploadToRemote,
  handleUpsertsToLocal,
  handleUpsertsToRemote,
};
