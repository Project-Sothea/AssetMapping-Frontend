/**
 * Image Upload Utility
 * Handles uploading local images to Supabase storage
 */

import { apiClient } from '~/services/apiClient';
import { extractFilename } from '../utils/uriUtils';

/**
 * Upload local images to remote storage
 * @returns Array of public URLs for uploaded images
 */
export async function imageUpload(
  entityId: string,
  localUris: string[] | string | null | undefined
): Promise<string[]> {
  // Handle various input types
  let uris: string[] = [];

  if (!localUris) return [];

  if (typeof localUris === 'string') {
    try {
      uris = JSON.parse(localUris);
    } catch {
      // If it's a single URI string, wrap in array
      uris = [localUris];
    }
  } else if (Array.isArray(localUris)) {
    uris = localUris;
  } else {
    return [];
  }

  if (!uris.length) return [];

  console.log(`📤 Uploading ${uris.length} images for ${entityId}`);

  // Get signed URLs for each image
  const signedUrls = await Promise.all(
    uris.map(async (uri, index) => {
      const filename = extractFilename(uri) || `image_${index}_${Date.now()}.jpg`;

      // Fetch the image to get its size
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`Failed to read image: ${response.status}`);
      const blob = await response.blob();

      const result = await apiClient.getSignedUrl({
        entityType: 'pin',
        entityId,
        filename,
        contentType: 'image/jpeg',
        sizeBytes: blob.size,
      });

      if (!result.success || !result.data) {
        throw new Error(`Failed to get signed URL: ${result.error}`);
      }

      return {
        localUri: uri,
        signedUrl: result.data.uploadUrl,
        publicUrl: result.data.publicUrl,
        blob, // Pass blob to avoid fetching twice
      };
    })
  );

  // Upload each image
  const uploadedUrls = await Promise.all(
    signedUrls.map(async ({ signedUrl, publicUrl, blob }) => {
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
      return publicUrl;
    })
  );

  console.log(`✅ Uploaded ${uploadedUrls.length} images`);
  return uploadedUrls;
}
