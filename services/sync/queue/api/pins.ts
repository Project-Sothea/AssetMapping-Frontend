import { apiClient } from '~/services/apiClient';
import { Pin } from '~/utils/globalTypes';
import { v4 as uuidv4 } from 'uuid';
import * as ImageManager from '~/services/sync/logic/images/ImageManager';
import { db } from '~/services/drizzleDb';
import { pins } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { QueryClient } from '@tanstack/react-query';

// Get query client for cache invalidation
let queryClient: QueryClient | null = null;
export const setQueryClient = (client: QueryClient) => {
  queryClient = client;
};

/**
 * Upsert a single pin via backend API
 * Used by queue system for individual sync operations
 */
export const upsertOne = async (pin: Pin) => {
  try {
    // Step 1: Upload local images to remote storage if they exist
    let remoteImageUrls: string[] = [];
    if (pin.localImages && Array.isArray(pin.localImages) && pin.localImages.length > 0) {
      console.log(`Uploading ${pin.localImages.length} images for pin ${pin.id}`);

      try {
        const uploadResult = await ImageManager.uploadToRemote(pin.id, pin.localImages);
        remoteImageUrls = uploadResult.images;
        console.log(`✓ Uploaded ${remoteImageUrls.length} images successfully`);
      } catch (uploadError: any) {
        console.error(`✖ Image upload failed for pin ${pin.id}:`, uploadError.message);

        // CRITICAL FIX: Invalidate React Query cache to remove optimistic images
        if (queryClient) {
          console.log(`  → Invalidating cache for pin ${pin.id}`);
          queryClient.invalidateQueries({ queryKey: ['pins', pin.id] });
          queryClient.invalidateQueries({ queryKey: ['pins'] });
        }

        // Update local DB to mark upload error
        await db
          .update(pins)
          .set({
            localImages: null, // Clear optimistic local images
            lastFailedSyncAt: new Date().toISOString(),
            failureReason: `Image upload failed: ${uploadError.message}`,
          })
          .where(eq(pins.id, pin.id));

        // Re-throw to mark queue operation as failed
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
    }

    // Step 2: Strip out sync status fields but KEEP localImages for reference
    const { lastSyncedAt, lastFailedSyncAt, status, failureReason, ...rest } = pin;

    const pinToSync = {
      ...rest,
      // Use uploaded remote URLs if available, otherwise keep existing images
      images: remoteImageUrls.length > 0 ? JSON.stringify(remoteImageUrls) : rest.images,
      updatedAt: rest.updatedAt ?? new Date().toISOString(),
    };

    // Step 3: Use backend API for sync
    const response = await apiClient.syncItem({
      idempotencyKey: uuidv4(),
      entityType: 'pin',
      operation: rest.id ? 'update' : 'create',
      payload: pinToSync,
      deviceId: 'mobile-app', // TODO: Get actual device ID
      timestamp: new Date().toISOString(),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to sync pin');
    }

    // Step 4: Update local database with remote image URLs AND download images locally
    if (remoteImageUrls.length > 0) {
      // Download the remote images to local storage so they persist on device
      console.log(`Downloading ${remoteImageUrls.length} remote images to local storage`);
      const downloadResult = await ImageManager.updateImagesLocally(
        pin.id,
        remoteImageUrls,
        [] // No existing local URIs since we just uploaded
      );

      await db
        .update(pins)
        .set({
          images: JSON.stringify(remoteImageUrls),
          localImages: JSON.stringify(downloadResult.success),
          lastSyncedAt: new Date().toISOString(),
        })
        .where(eq(pins.id, pin.id));
      console.log(
        `Updated local DB with ${remoteImageUrls.length} remote URLs and ${downloadResult.success.length} local paths`
      );
    }
  } catch (e) {
    console.error('Failed to upsert pin:', e);
    throw new Error('Error upserting pin via backend API');
  }
};

/**
 * Soft delete a pin via backend API
 * Sets deletedAt timestamp instead of removing the record
 * Used by queue system for delete operations
 */
export const deletePin = async (pinId: string) => {
  try {
    const response = await apiClient.syncItem({
      idempotencyKey: uuidv4(),
      entityType: 'pin',
      operation: 'delete',
      payload: { id: pinId },
      deviceId: 'mobile-app', // TODO: Get actual device ID
      timestamp: new Date().toISOString(),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete pin');
    }
  } catch (e) {
    console.error('Failed to soft delete pin:', e);
    throw new Error('Error soft deleting pin via backend API');
  }
};
