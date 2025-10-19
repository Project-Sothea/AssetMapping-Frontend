/**
 * Sync Operations - Backend API calls for pins and forms
 */

import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '~/services/drizzleDb';
import { pins, forms } from '~/db/schema';
import { apiClient } from '~/services/apiClient';
import { ImageManager } from '~/services/images';

type Operation = 'create' | 'update' | 'delete';

/**
 * Sync pin to backend
 */
export async function syncPin(operation: Operation, data: any): Promise<void> {
  if (operation === 'delete') {
    const response = await apiClient.syncItem({
      idempotencyKey: uuidv4(),
      entityType: 'pin',
      operation: 'delete',
      payload: { id: data.id },
      deviceId: 'mobile-app',
      timestamp: new Date().toISOString(),
    });
    if (!response.success) throw new Error(response.error || 'Sync failed');
    return;
  }

  // Upload images if present
  let remoteUrls: string[] = [];
  if (data.localImages?.length > 0) {
    remoteUrls = await ImageManager.uploadImages(data.id, data.localImages);
  }

  // Prepare payload
  const { lastSyncedAt, lastFailedSyncAt, status, failureReason, ...rest } = data;
  const payload: any = {
    ...rest,
    updatedAt: rest.updatedAt || new Date().toISOString(),
  };

  // Set images field
  if (remoteUrls.length > 0) {
    payload.images = JSON.stringify(remoteUrls);
  } else if (rest.images) {
    payload.images = rest.images;
  }

  // Sync to backend
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

  // Update local DB with remote URLs and sync status
  if (remoteUrls.length > 0) {
    await db
      .update(pins)
      .set({
        images: JSON.stringify(remoteUrls),
        lastSyncedAt: new Date().toISOString(),
        status: 'synced',
      })
      .where(eq(pins.id, data.id));
  } else {
    // Still update sync status even without images
    await db
      .update(pins)
      .set({
        lastSyncedAt: new Date().toISOString(),
        status: 'synced',
      })
      .where(eq(pins.id, data.id));
  }
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
