/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { pins, forms, Form, Pin } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { parseImageFilenames } from '~/services/images/ImageManager';

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
  const { failureReason, status, lastSyncedAt, lastFailedSyncAt, ...rest } = data;
  const formData = new FormData();
  formData.append(
    'data',
    JSON.stringify({
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
    })
  );
  const response = await apiClient.syncItem(formData);

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
  data: Pin
): Promise<Record<string, unknown> | undefined> {
  const { lastSyncedAt, lastFailedSyncAt, status, failureReason, ...rest } = data;

  const payload: Record<string, unknown> = {
    ...rest,
    version: rest.version, // Include version for conflict detection
    updatedAt: rest.updatedAt || new Date().toISOString(),
  };

  // Create FormData for multipart request
  const formData = new FormData();

  // Add sync request data as JSON string
  formData.append(
    'data',
    JSON.stringify({
      idempotencyKey: uuidv4(),
      entityType: 'pin',
      operation, // use the requested operation from the queue
      payload,
      deviceId: 'mobile-app',
      timestamp: new Date().toISOString(),
    })
  );

  const filenames = parseImageFilenames(data.images);
  if (filenames.length > 0) {
    const { getLocalPath } = await import('~/services/images/ImageManager');

    filenames.forEach((filename) => {
      const uri = getLocalPath(data.id, filename);
      console.log(`📎 Attaching image for upload: ${uri}`);
      // Determine MIME type from file extension
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

      formData.append('images', {
        uri,
        name: filename,
        type: mimeType,
      } as any);
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
 * Updates version and image filenames from backend to keep local and remote in sync
 */
async function updateLocalPinAfterSync(
  pinId: string,
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

  // Update images from backend (backend returns filenames or paths)
  if (syncedData && typeof syncedData === 'object' && 'images' in syncedData) {
    const { parseImageFilenames } = await import('~/services/images/ImageManager');
    const backendImages = parseImageFilenames(syncedData.images as string | string[]);

    // Extract just filenames (backend might return paths like "pin/ID/file.jpg")
    const filenames = backendImages.map((path) => path.split('/').pop() || path);

    // Store filenames in database
    updates.images = JSON.stringify(filenames);
  }

  await db.update(pins).set(updates).where(eq(pins.id, pinId));
}
