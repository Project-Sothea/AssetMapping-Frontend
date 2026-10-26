/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { Form, OperationType, Pin } from '@assetmapping/shared-types';

import { fetchPin } from '~/services/api/pinsApi';
import { deleteObjects, getUploadUrl } from '~/services/api/storageApi';
import { sync } from '~/services/api/syncApi';
import { getLocalPath } from '~/services/images/ImageManager';
import { getDeviceId } from '~/shared/utils/getDeviceId';

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

  // Delete removed images from S3 (only after successful sync to avoid drift)
  if (imagesToDelete.length > 0) {
    await deleteImagesFromS3(payload.id, imagesToDelete);
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
    const ext = imageId.split('.').pop()?.toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    const key = buildImageKey(pinId, imageId);

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
