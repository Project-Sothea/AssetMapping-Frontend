/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { pins, forms } from '~/db/schema';
import { Form } from '~/features/forms/types';
import { Pin } from '~/features/pins/types';
import { fetchPin } from '~/services/api/pinsApi';
import { deleteObjects, getUploadUrl } from '~/services/api/storageApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';
import { getLocalPath } from '~/services/images/ImageManager';

import { pullFormUpdate, pullPinUpdate } from '../pullUpdates';

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
  const syncedData = await syncPinToBackend(operation, data);

  await updateLocalPinAfterSync(data.id, syncedData);
}

/**
 * Sync form to backend
 */
export async function syncForm(operation: Operation, data: Form): Promise<void> {
  const { status, ...rest } = data;
  const response = await sync({
    idempotencyKey: uuidv4(),
    entityType: 'form',
    operation,
    payload:
      operation === 'delete'
        ? { id: data.id }
        : {
            ...rest,
            version: rest.version,
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
  const response = await sync({
    idempotencyKey: uuidv4(),
    entityType: 'pin',
    operation: 'delete',
    payload: { id: pinId },
    deviceId: 'mobile-app',
    timestamp: new Date().toISOString(),
  });

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
  data: Pin
): Promise<Record<string, unknown> | undefined> {
  const { status, ...rest } = data;

  const payload: Record<string, unknown> = {
    ...rest,
    version: rest.version, // Include version for conflict detection
    updatedAt: rest.updatedAt || new Date().toISOString(),
  };

  const filenames = data.images || [];
  const {
    imagesToUpload,
    imagesToDelete,
  }: {
    imagesToUpload: string[];
    imagesToDelete: string[];
  } = await determineImageChanges(operation, data.id, filenames);

  if (imagesToUpload.length > 0) {
    await uploadImagesToS3(data.id, imagesToUpload);
  }

  const response = await sync({
    idempotencyKey: uuidv4(),
    entityType: 'pin',
    operation,
    payload,
    deviceId: 'mobile-app',
    timestamp: new Date().toISOString(),
  });

  // Handle version conflicts - pull latest data
  if (!response.success) {
    if (response.error?.includes('Conflict') || response.error?.includes('newer data')) {
      console.warn(`⚠️ Version conflict for pin ${data.id} - pulling latest from server`);

      // Pull latest data from server (will overwrite local changes)
      await pullPinUpdate(data.id);

      console.log(`✅ Replaced local pin ${data.id} with server version (Last-Write-Wins)`);
      return; // Success - conflict resolved by accepting server data
    }

    // Other errors - throw to trigger retry
    throw new Error(response.error || 'Sync failed');
  }

  // Return the synced data from backend (includes updated version)
  const synced = response.data;

  // Delete removed images from S3 (only after successful sync to avoid drift)
  if (imagesToDelete.length > 0) {
    await deleteImagesFromS3(data.id, imagesToDelete);
  }

  return synced;
}

/**
 * Update local database after successful sync
 * Updates version and image filenames from backend to keep local and remote in sync
 */
async function updateLocalPinAfterSync(
  pinId: string,
  syncedData?: Record<string, unknown>
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: 'synced',
  };

  // Update version from backend response to stay in sync
  if (syncedData && typeof syncedData === 'object' && 'version' in syncedData) {
    updates.version = syncedData.version;
    console.log(`✅ Updated local version to ${syncedData.version}`);
  }

  await db.update(pins).set(updates).where(eq(pins.id, pinId));
}

function buildImageKey(pinId: string, imageId: string): string {
  return `pins/${pinId}/${imageId}`;
}

async function uploadImagesToS3(pinId: string, imageIds: string[]): Promise<void> {
  for (const imageId of imageIds) {
    const uri = getLocalPath(pinId, imageId);
    const ext = imageId.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const key = buildImageKey(pinId, imageId);

    console.log(`⬆️ Uploading image via presigned URL: ${key}`);
    const upload = await getUploadUrl(key, contentType);
    if (!upload.success) {
      throw new Error(upload.error);
    }
    const uploadUrl = upload.data;

    const fileResponse = await fetch(uri);
    if (!fileResponse.ok) {
      throw new Error(`Failed to read local image at ${uri}`);
    }
    const blob = await fileResponse.blob();
    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });

    if (!putResponse.ok) {
      throw new Error(
        `Failed to upload image ${imageId} to storage (status ${putResponse.status})`
      );
    }
  }
}

async function deleteImagesFromS3(pinId: string, imageIds: string[]): Promise<void> {
  const keys = imageIds.map((imageId) => buildImageKey(pinId, imageId));
  const result = await deleteObjects(keys);

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete images from storage');
  }

  if (result.data?.errors) {
    console.warn('⚠️ Some images failed to delete from storage:', result.data.errors);
  }
}

async function determineImageChanges(
  operation: Operation,
  pinId: string,
  currentImages: string[]
): Promise<{ imagesToUpload: string[]; imagesToDelete: string[] }> {
  if (operation === 'create') {
    return { imagesToUpload: currentImages, imagesToDelete: [] };
  }

  // For updates, compare local images to remote to detect adds/removals
  const remoteImages = await getRemoteImages(pinId);
  const remoteSet = new Set(remoteImages);
  const currentSet = new Set(currentImages);

  const imagesToUpload = currentImages.filter((img) => !remoteSet.has(img));
  const imagesToDelete = remoteImages.filter((img) => !currentSet.has(img));

  return { imagesToUpload, imagesToDelete };
}

async function getRemoteImages(pinId: string): Promise<string[]> {
  try {
    const response = await fetchPin(pinId);
    if (response.success && response.data) {
      const images = (response.data as { images?: string[] | null }).images;
      if (Array.isArray(images)) {
        return images;
      }
    }
  } catch (error) {
    console.warn('⚠️ Unable to fetch remote images for pin', pinId, error);
  }

  return [];
}
