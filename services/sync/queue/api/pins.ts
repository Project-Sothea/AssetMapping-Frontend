import { apiClient } from '~/services/apiClient';
import { v4 as uuidv4 } from 'uuid';
import { db } from '~/services/drizzleDb';
import { Pin, pins } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { QueryClient } from '@tanstack/react-query';

/**
 * Upload images to remote storage using signed URLs
 * Delete-all-and-reupload approach for simplicity
 */
async function uploadImagesToRemote(pinId: string, localImageUris: string[]): Promise<string[]> {
  if (!localImageUris?.length) return [];

  console.log(`Getting signed URLs for ${localImageUris.length} images`);

  // Get signed URLs for each image
  const signedUrlPromises = localImageUris.map(async (localUri, index) => {
    // Extract filename from URI or generate one
    const filename = extractFilename(localUri) || `image_${index}_${Date.now()}.jpg`;

    const result = await apiClient.getSignedUrl({
      entityType: 'pin',
      entityId: pinId,
      filename,
      contentType: 'image/jpeg',
    });

    if (!result.success || !result.data) {
      throw new Error(`Failed to get signed URL for image ${index}: ${result.error}`);
    }

    return {
      localUri,
      signedUrl: result.data.uploadUrl,
      publicUrl: result.data.publicUrl,
    };
  });

  const signedUrls = await Promise.all(signedUrlPromises);
  console.log(`Got ${signedUrls.length} signed URLs`);

  // Upload each image to its signed URL
  const uploadPromises = signedUrls.map(async ({ localUri, signedUrl, publicUrl }) => {
    try {
      // Get image blob from local URI
      const response = await fetch(localUri);
      if (!response.ok) {
        throw new Error(`Failed to read local image: ${response.status}`);
      }
      const blob = await response.blob();

      // Upload to signed URL
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      console.log(`✓ Uploaded image to ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error(`✖ Failed to upload ${localUri}:`, error);
      throw error;
    }
  });

  const remoteUrls = await Promise.all(uploadPromises);
  console.log(`✓ Successfully uploaded ${remoteUrls.length} images`);
  return remoteUrls;
}

/**
 * Extract filename from a local file URI
 */
function extractFilename(localUri: string): string | null {
  if (!localUri) return null;

  // Remove 'file://' prefix if present
  const cleanedUri = localUri.startsWith('file://') ? localUri.slice(7) : localUri;

  // Find the last slash position
  const lastSlashIndex = cleanedUri.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return null; // No slash found
  }

  // Extract filename after the last slash
  return cleanedUri.substring(lastSlashIndex + 1);
}

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
        remoteImageUrls = await uploadImagesToRemote(pin.id, pin.localImages);
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
      updatedAt: rest.updatedAt ?? new Date().toISOString(),
    };

    // Set images field appropriately
    if (remoteImageUrls.length > 0) {
      pinToSync.images = JSON.stringify(remoteImageUrls);
    } else if (rest.images) {
      pinToSync.images = rest.images;
    }
    // If no remote URLs and no existing images, omit the images field to avoid overwriting with null

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

    // Step 4: Update local database with remote image URLs
    if (remoteImageUrls.length > 0) {
      await db
        .update(pins)
        .set({
          images: JSON.stringify(remoteImageUrls),
          lastSyncedAt: new Date().toISOString(),
        })
        .where(eq(pins.id, pin.id));
      console.log(`Updated local DB with ${remoteImageUrls.length} remote URLs`);
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
