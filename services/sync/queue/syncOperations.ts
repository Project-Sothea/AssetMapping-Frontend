/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { pins, forms, Form, Pin } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { urisToFiles } from '~/services/images/utils/fileUtils';
import { parseImageUris } from '~/services/images/utils/uriUtils';
import { validateFilesExist } from '~/services/images/imageStorage/fileSystemsUtils';

type Operation = 'create' | 'update' | 'delete';

/**
 * Sync pin to backend
 */
export async function syncPin(operation: Operation, data: Pin): Promise<void> {
  // Handle delete operations
  if (operation === 'delete') {
    await deletePinOnBackend(data.id);
    return;
  }

  // Handle create/update operations with image upload
  // Validate local images exist
  const localUris = parseImageUris(data.localImages);
  const validLocalUris = await validateFilesExist(localUris);

  const syncedData = await syncPinToBackend(operation, data, validLocalUris);

  await updateLocalPinAfterSync(data.id, validLocalUris, syncedData);
}

/**
 * Sync form to backend
 */
export async function syncForm(operation: Operation, data: Form): Promise<void> {
  const { failureReason, status, lastSyncedAt, lastFailedSyncAt, ...rest } = data;

  const response = await apiClient.syncItem({
    idempotencyKey: uuidv4(),
    entityType: 'form',
    operation,
    payload:
      operation === 'delete'
        ? { id: data.id }
        : {
            ...rest,
            version: rest.version, // Include version for conflict detection
            updatedAt: rest.updatedAt || new Date().toISOString(),
          },
    deviceId: 'mobile-app',
    timestamp: new Date().toISOString(),
  });

  // Handle version conflicts - pull latest data
  if (!response.success) {
    if (response.error?.includes('Conflict') || response.error?.includes('newer data')) {
      console.warn(`⚠️ Version conflict for form ${data.id} - pulling latest from server`);

      // Pull latest data from server (will overwrite local changes)
      const { pullFormUpdate } = await import('../pullUpdates');
      await pullFormUpdate(data.id);

      console.log(`✅ Replaced local form ${data.id} with server version (Last-Write-Wins)`);
      return; // Success - conflict resolved by accepting server data
    }

    // Other errors - throw to trigger retry
    throw new Error(response.error || 'Sync failed');
  }

  // Mark form as synced in local DB and update version from backend (skip for delete operations)
  if (operation !== 'delete') {
    const updates: Record<string, unknown> = {
      lastSyncedAt: new Date().toISOString(),
      status: 'synced',
    };

    // Update version from backend response to stay in sync
    if (response.data && typeof response.data === 'object' && 'version' in response.data) {
      updates.version = response.data.version;
      console.log(`✅ Updated local form version to ${response.data.version}`);
    }

    await db.update(forms).set(updates).where(eq(forms.id, data.id));
  }
}

// ========== Helper Functions ==========

/**
 * Delete pin on backend
 */
async function deletePinOnBackend(pinId: string): Promise<void> {
  // Create FormData for consistency with other sync operations
  const formData = new FormData();
  formData.append(
    'data',
    JSON.stringify({
      idempotencyKey: uuidv4(),
      entityType: 'pin',
      operation: 'delete',
      payload: { id: pinId },
      deviceId: 'mobile-app',
      timestamp: new Date().toISOString(),
    })
  );

  const response = await apiClient.syncItem(formData);

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete pin');
  }
}

/**
 * Push pin data to backend
 * Returns the synced pin data from backend (includes updated version)
 */
async function syncPinToBackend(
  operation: Operation,
  data: Pin,
  validLocalUris: string[]
): Promise<Record<string, unknown> | undefined> {
  const { lastSyncedAt, lastFailedSyncAt, status, failureReason, localImages, images, ...rest } =
    data;

  const payload: Record<string, unknown> = {
    ...rest,
    version: rest.version, // Include version for conflict detection
    updatedAt: rest.updatedAt || new Date().toISOString(),
  };

  // For updates: include existing remote images URLs to keep (deletions are implicit)
  // Backend will merge these with newly uploaded images
  if (operation === 'update' && images) {
    const existingRemoteUrls = parseImageUris(images);
    if (existingRemoteUrls.length > 0) {
      payload.images = JSON.stringify(existingRemoteUrls);
    }
  }

  // Create FormData for multipart request
  const formData = new FormData();

  // Add sync request data as JSON string
  formData.append(
    'data',
    JSON.stringify({
      idempotencyKey: uuidv4(),
      entityType: 'pin',
      operation: rest.id ? 'update' : 'create',
      payload,
      deviceId: 'mobile-app',
      timestamp: new Date().toISOString(),
    })
  );

  // Attach only new image files (not present in remote images array)
  let newImageUris: string[] = validLocalUris;
  if (operation === 'update' && images) {
    const existingRemoteUrls = parseImageUris(images);
    // Only upload images that are not already present in remote images
    newImageUris = validLocalUris.filter((uri) => {
      // Compare by filename (UUID.jpg)
      const localFilename = uri.split('/').pop();
      return !existingRemoteUrls.some((remote) => remote.split('/').pop() === localFilename);
    });
  }
  if (newImageUris.length > 0) {
    console.log(`📎 Attaching ${newImageUris.length} new images to sync request`);
    const imageFiles = urisToFiles(newImageUris);
    console.log('🔍 Image file metadata:', JSON.stringify(imageFiles, null, 2));
    imageFiles.forEach((file, index) => {
      // React Native FormData requires { uri, name, type } format
      console.log(`  📎 Appending image ${index + 1}:`, file);
      formData.append('images', file as any);
    });
  }

  const response = await apiClient.syncItem(formData);

  // Handle version conflicts - pull latest data
  if (!response.success) {
    if (response.error?.includes('Conflict') || response.error?.includes('newer data')) {
      console.warn(`⚠️ Version conflict for pin ${data.id} - pulling latest from server`);

      // Pull latest data from server (will overwrite local changes)
      const { pullPinUpdate } = await import('../pullUpdates');
      await pullPinUpdate(data.id);

      console.log(`✅ Replaced local pin ${data.id} with server version (Last-Write-Wins)`);
      return; // Success - conflict resolved by accepting server data
    }

    // Other errors - throw to trigger retry
    throw new Error(response.error || 'Sync failed');
  }

  // Return the synced data from backend (includes updated version)
  return response.data;
}

/**
 * Update local database after successful sync
 * Updates version and remote image URLs from backend to keep local and remote in sync
 */
async function updateLocalPinAfterSync(
  pinId: string,
  validLocalUris: string[],
  syncedData?: Record<string, unknown>
): Promise<void> {
  const updates: Record<string, unknown> = {
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
  };

  // Update version from backend response to stay in sync
  if (syncedData && typeof syncedData === 'object' && 'version' in syncedData) {
    updates.version = syncedData.version;
    console.log(`✅ Updated local version to ${syncedData.version}`);
  }

  // Update remote image URLs from backend (backend returns updated images array)
  if (syncedData && typeof syncedData === 'object' && 'images' in syncedData) {
    updates.images = syncedData.images;
    const remoteImagePaths = parseImageUris(syncedData.images as string | string[]);
    // Download backend images and update localImages to match backend UUIDs
    const { downloadRemoteImages } = await import('~/services/images/ImageManager');
    const localImagePaths = await downloadRemoteImages(pinId, remoteImagePaths);
    updates.localImages = JSON.stringify(localImagePaths);
    const imageCount = localImagePaths.length;
    console.log(`✅ Synced ${imageCount} images with backend and updated local copies`);
  } else if (validLocalUris.length > 0) {
    // Only keep localImages if backend didn't return images (edge case)
    updates.localImages = JSON.stringify(validLocalUris);
    console.log(`✅ Keeping ${validLocalUris.length} local images for offline access`);
  }

  await db.update(pins).set(updates).where(eq(pins.id, pinId));
}
