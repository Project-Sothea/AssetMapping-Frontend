/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { pins, forms, Form, Pin } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { validateAndUploadImages } from '~/services/images';

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
  const { remoteUrls, validLocalUris } = await validateAndUploadImages(data.id, data.localImages);

  const syncedData = await syncPinToBackend(operation, data, remoteUrls);

  await updateLocalPinAfterSync(data.id, remoteUrls, validLocalUris, syncedData);
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
 * Returns the synced pin data from backend (includes updated version)
 */
async function syncPinToBackend(
  operation: Operation,
  data: Pin,
  remoteUrls: string[]
): Promise<Record<string, unknown> | undefined> {
  const { lastSyncedAt, lastFailedSyncAt, status, failureReason, localImages, ...rest } = data;

  const payload: Record<string, unknown> = {
    ...rest,
    version: rest.version, // Include version for conflict detection
    updatedAt: rest.updatedAt || new Date().toISOString(),
  };

  // Handle images field:
  // - If we have new uploads (remoteUrls), use those
  // - Otherwise, use the existing images field from the pin (this includes deletions!)
  // - This ensures deleted images are properly synced to backend
  if (remoteUrls.length > 0) {
    payload.images = JSON.stringify(remoteUrls);
  } else if (rest.images !== undefined) {
    // Include images even if empty array - this tells backend about deletions
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
 * Updates version from backend to keep local and remote in sync
 */
async function updateLocalPinAfterSync(
  pinId: string,
  remoteUrls: string[],
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

  // Update remote image URLs if we uploaded any
  if (remoteUrls.length > 0) {
    updates.images = JSON.stringify(remoteUrls);
    console.log(`✅ Uploaded ${remoteUrls.length} images to backend`);
  }

  // KEEP localImages for offline access
  // These local files are still on disk and provide fast offline access
  if (validLocalUris.length > 0) {
    updates.localImages = JSON.stringify(validLocalUris);
    console.log(`✅ Keeping ${validLocalUris.length} local images for offline access`);
  }

  await db.update(pins).set(updates).where(eq(pins.id, pinId));
}
