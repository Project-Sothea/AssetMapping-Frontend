/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { Form, OperationType, Pin } from '@assetmapping/shared-types';
import { eq } from 'drizzle-orm';
import {
  createUploadTask,
  FileSystemSessionType,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { File } from 'expo-file-system/next';

import { pins, forms } from '~/db/schema';
import { fetchPin } from '~/services/api/pinsApi';
import { deleteObjects, getUploadUrl } from '~/services/api/storageApi';
import { sync } from '~/services/api/syncApi';
import { db } from '~/services/drizzleDb';
import { getLocalPath } from '~/services/images/ImageManager';

/**
 * Sync pin to backend
 */
export async function syncPin(
  operation: OperationType,
  data: Pin,
  idempotencyKey: string
): Promise<void> {
  // Handle delete operations
  if (operation === 'delete') {
    await deletePinOnBackend(data.id, idempotencyKey);
    return;
  }

  // Handle create/update operations with image upload
  const syncedData = await syncPinToBackend(operation, data, idempotencyKey);

  await updateLocalPinAfterSync(data.id, syncedData);
}

/**
 * Sync form to backend
 */
export async function syncForm(
  operation: OperationType,
  data: Form,
  idempotencyKey: string
): Promise<void> {
  if (operation === 'delete') {
    await deleteFormOnBackend(data.id, idempotencyKey);
    return;
  }

  const syncedData = await syncFormToBackend(operation, data, idempotencyKey);
  await updateLocalFormAfterSync(data.id, syncedData);
}

// ========== Helper Functions ==========
/**
 * Push pin data to backend
 * Returns the synced pin data from backend (includes updated version)
 */
async function syncPinToBackend(
  operation: OperationType,
  payload: Pin,
  idempotencyKey: string
): Promise<Record<string, unknown> | undefined> {
  const filenames = payload.images || [];
  const {
    imagesToUpload,
    imagesToDelete,
  }: {
    imagesToUpload: string[];
    imagesToDelete: string[];
  } = await determineImageChanges(operation, payload.id, filenames);

  if (imagesToUpload.length > 0) {
    await uploadImagesToS3(payload.id, imagesToUpload);
  }

  const response = await sync({
    idempotencyKey,
    entityType: 'pin',
    operation,
    payload,
    deviceId: 'mobile-app',
    timestamp: new Date(),
  });

  // Handle version conflicts - pull latest data
  if (!response.success) {
    // Other errors - throw to trigger retry
    throw new Error(response.error || 'Sync failed');
  }

  // Return the synced data from backend (includes updated version)
  const synced = response.data;

  // Delete removed images from S3 (only after successful sync to avoid drift)
  if (imagesToDelete.length > 0) {
    await deleteImagesFromS3(payload.id, imagesToDelete);
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
  }

  await db.update(pins).set(updates).where(eq(pins.id, pinId));
}

/**
 * Delete pin on backend
 */
async function deletePinOnBackend(pinId: string, idempotencyKey: string): Promise<void> {
  const response = await sync({
    idempotencyKey,
    entityType: 'pin',
    operation: 'delete',
    payload: { id: pinId },
    deviceId: 'mobile-app',
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete pin');
  }
}

async function syncFormToBackend(
  operation: OperationType,
  payload: Form,
  idempotencyKey: string
): Promise<Record<string, unknown> | undefined> {
  const response = await sync({
    idempotencyKey,
    entityType: 'form',
    operation,
    payload,
    deviceId: 'mobile-app',
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Sync failed');
  }

  return response.data;
}

async function deleteFormOnBackend(formId: string, idempotencyKey: string): Promise<void> {
  const response = await sync({
    idempotencyKey,
    entityType: 'form',
    operation: 'delete',
    payload: { id: formId },
    deviceId: 'mobile-app',
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete form');
  }
}

async function updateLocalFormAfterSync(
  formId: string,
  syncedData?: Record<string, unknown>
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: 'synced',
  };

  if (syncedData && typeof syncedData === 'object' && 'version' in syncedData) {
    updates.version = (syncedData as Record<string, unknown>).version;
  }

  await db.update(forms).set(updates).where(eq(forms.id, formId));
}

function buildImageKey(pinId: string, imageId: string): string {
  return `pins/${pinId}/${imageId}`;
}

async function uploadImagesToS3(pinId: string, imageIds: string[]): Promise<void> {
  for (const imageId of imageIds) {
    const uri = getLocalPath(pinId, imageId);
    const file = new File(uri);
    if (!file.exists || file.size <= 0) {
      throw new Error(
        `Photo ${imageId} is missing or empty on this device. Restore or replace it before uploading.`
      );
    }
    const ext = imageId.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';
    const key = buildImageKey(pinId, imageId);

    const upload = await getUploadUrl(key, contentType);
    if (!upload.success || typeof upload.data !== 'string' || !upload.data) {
      const reason = upload.success ? 'storage returned no upload URL' : upload.error;
      throw new Error(
        `Photo ${imageId}: could not obtain upload URL (${reason || 'storage unavailable'}).`
      );
    }
    const uploadUrl = upload.data;

    const task = createUploadTask(uploadUrl, uri, {
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      sessionType: FileSystemSessionType.FOREGROUND,
      headers: { 'Content-Type': contentType },
    });
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Native URLSession/OkHttp reads the file; no photo-sized JS buffer is allocated.
      const response = await Promise.race([
        task.uploadAsync(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            void task.cancelAsync().catch(() => {});
            reject(new Error('Upload timed out'));
          }, 60000);
        }),
      ]);
      if (!response) throw new Error('Upload cancelled');
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Photo ${imageId} upload failed (HTTP ${response.status}).`);
      }
    } catch (error) {
      // Expo removes progress subscriptions on resolution, but not rejection.
      if (!timedOut) void task.cancelAsync().catch(() => {});
      if (timedOut) {
        throw new Error(
          `Photo ${imageId} upload timed out. Your data is kept on this device; retry when the connection improves.`
        );
      }
      // Do not expose signed storage URLs in native network error messages.
      if (error instanceof Error && error.message.startsWith(`Photo ${imageId} upload failed`))
        throw error;
      throw new Error(
        `Photo ${imageId} could not upload. Your data is kept on this device; check your connection and retry.`
      );
    } finally {
      clearTimeout(timeout);
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
  operation: OperationType,
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
  const response = await fetchPin(pinId);
  if (!response.success || !response.data) {
    const reason = response.success ? 'pin unavailable' : response.error;
    throw new Error(
      `Could not check remote photos before uploading (${reason || 'pin unavailable'}). Retry when the connection improves.`
    );
  }
  const images = (response.data as { images?: string[] | null }).images;
  if (!Array.isArray(images) || images.some((image) => typeof image !== 'string')) {
    throw new Error('Could not check remote photos: the server returned invalid image metadata.');
  }
  return images;
}
