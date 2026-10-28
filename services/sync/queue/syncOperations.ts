/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { Form, OperationType, Pin } from '@assetmapping/shared-types';
import {
  createUploadTask,
  FileSystemSessionType,
  FileSystemUploadType,
} from 'expo-file-system/legacy';
import { File } from 'expo-file-system/next';

import { fetchPin } from '~/services/api/pinsApi';
import { deleteObjects, getUploadUrl } from '~/services/api/storageApi';
import { sync } from '~/services/api/syncApi';
import { getLocalPath } from '~/services/images/ImageManager';
import { getDeviceId } from '~/shared/utils/getDeviceId';

import { validateServerAcknowledgement } from './acknowledgement';

/**
 * Sync pin to backend
 */
export async function syncPin(
  operation: OperationType,
  data: Pin,
  idempotencyKey: string
): Promise<Record<string, unknown> | undefined> {
  // Handle delete operations
  if (operation === 'delete') {
    return deletePinOnBackend(data, idempotencyKey);
  }

  // Handle create/update operations with image upload
  return syncPinToBackend(operation, data, idempotencyKey);
}

/**
 * Sync form to backend
 */
export async function syncForm(
  operation: OperationType,
  data: Form,
  idempotencyKey: string
): Promise<Record<string, unknown> | undefined> {
  if (operation === 'delete') {
    return deleteFormOnBackend(data, idempotencyKey);
  }

  return syncFormToBackend(operation, data, idempotencyKey);
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
    deviceId: getDeviceId(),
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Sync failed');
  }

  // Return the synced data from backend (includes updated version)
  const synced = response.data;

  // An HTTP success alone is insufficient: keep originals if the server did not
  // confirm this exact record. Storage cleanup must not invalidate a valid entity
  // acknowledgement or lose its version when the record has already committed.
  validateServerAcknowledgement(payload.id, operation, payload, synced);
  if (imagesToDelete.length > 0) {
    try {
      await deleteImagesFromS3(payload.id, imagesToDelete);
    } catch {
      console.warn('Pin uploaded; unused remote photos could not be removed.');
    }
  }

  return synced;
}

/**
 * Delete pin on backend
 */
async function deletePinOnBackend(
  pin: Pin,
  idempotencyKey: string
): Promise<Record<string, unknown>> {
  const response = await sync({
    idempotencyKey,
    entityType: 'pin',
    operation: 'delete',
    payload: { id: pin.id, version: pin.version },
    deviceId: getDeviceId(),
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete pin');
  }
  return response.data;
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
    deviceId: getDeviceId(),
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Sync failed');
  }

  return response.data;
}

async function deleteFormOnBackend(
  form: Form,
  idempotencyKey: string
): Promise<Record<string, unknown>> {
  const response = await sync({
    idempotencyKey,
    entityType: 'form',
    operation: 'delete',
    payload: { id: form.id, version: form.version, pinId: form.pinId },
    deviceId: getDeviceId(),
    timestamp: new Date(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to delete form');
  }
  return response.data;
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
