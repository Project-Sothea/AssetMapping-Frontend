/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { pins, forms } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { validateAndUploadImages } from '~/services/images';

type Operation = 'create' | 'update' | 'delete';

/**
 * Sync pin to backend
 */
export async function syncPin(operation: Operation, data: any): Promise<void> {
  // Handle delete operations
  if (operation === 'delete') {
    await deletePinOnBackend(data.id);
    return;
  }

  // Handle create/update operations with image upload
  const { remoteUrls, validLocalUris } = await validateAndUploadImages(data.id, data.localImages);

  await syncPinToBackend(operation, data, remoteUrls);

  await updateLocalPinAfterSync(data.id, remoteUrls, validLocalUris);
}

/**
 * Sync form to backend
 */
export async function syncForm(operation: Operation, data: any): Promise<void> {
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
            updatedAt: rest.updatedAt || new Date().toISOString(),
          },
    deviceId: 'mobile-app',
    timestamp: new Date().toISOString(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Sync failed');
  }

  // Mark form as synced in local DB (skip for delete operations)
  if (operation !== 'delete') {
    await db
      .update(forms)
      .set({
        lastSyncedAt: new Date().toISOString(),
        status: 'synced',
      })
      .where(eq(forms.id, data.id));
  }
}

// ========== Helper Functions ==========

/**
 * Delete pin on backend
 */
async function deletePinOnBackend(pinId: string): Promise<void> {
  const response = await apiClient.syncItem({
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
 */
async function syncPinToBackend(
  operation: Operation,
  data: any,
  remoteUrls: string[]
): Promise<void> {
  const { lastSyncedAt, lastFailedSyncAt, status, failureReason, ...rest } = data;

  const payload: any = {
    ...rest,
    updatedAt: rest.updatedAt || new Date().toISOString(),
  };

  // Include remote image URLs if available
  if (remoteUrls.length > 0) {
    payload.images = JSON.stringify(remoteUrls);
  } else if (rest.images) {
    payload.images = rest.images;
  }

  const response = await apiClient.syncItem({
    idempotencyKey: uuidv4(),
    entityType: 'pin',
    operation: rest.id ? 'update' : 'create',
    payload,
    deviceId: 'mobile-app',
    timestamp: new Date().toISOString(),
  });

  if (!response.success) {
    throw new Error(response.error || 'Sync failed');
  }
}

/**
 * Update local database after successful sync
 */
async function updateLocalPinAfterSync(
  pinId: string,
  remoteUrls: string[],
  validLocalUris: string[]
): Promise<void> {
  const updates: any = {
    lastSyncedAt: new Date().toISOString(),
    status: 'synced',
  };

  // Update remote image URLs if we uploaded any
  if (remoteUrls.length > 0) {
    updates.images = JSON.stringify(remoteUrls);
  }

  // Clean up localImages to remove deleted/invalid files
  if (validLocalUris.length > 0) {
    updates.localImages = JSON.stringify(validLocalUris);
    console.log(`Cleaned up localImages: ${validLocalUris.length} valid files`);
  }

  await db.update(pins).set(updates).where(eq(pins.id, pinId));
}
