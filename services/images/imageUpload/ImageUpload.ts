/**
 * Image Upload Utility
 * Handles uploading local images to Supabase storage
 */

import { apiClient } from '~/services/apiClient';
import { extractFilename } from '../utils/uriUtils';
import { parseUriInput } from '~/shared/utils/parsing';

interface SignedUploadData {
  localUri: string;
  signedUrl: string;
  publicUrl: string;
  blob: Blob;
}

/**
 * Upload local images to remote storage
 * @returns Array of public URLs for uploaded images
 */
export async function imageUpload(
  entityId: string,
  localUris: string[] | string | null | undefined
): Promise<string[]> {
  const uris = parseUriInput(localUris);

  if (uris.length === 0) return [];

  console.log(`📤 Uploading ${uris.length} images for ${entityId}`);

  const signedData = await prepareSignedUploads(entityId, uris);
  const uploadedUrls = await uploadAllImages(signedData);

  console.log(`✅ Uploaded ${uploadedUrls.length} images`);
  return uploadedUrls;
}

// ========== Helper Functions ==========

/**
 * Prepare signed upload URLs for all images
 */
async function prepareSignedUploads(entityId: string, uris: string[]): Promise<SignedUploadData[]> {
  return Promise.all(uris.map((uri, index) => prepareSignedUpload(entityId, uri, index)));
}

/**
 * Prepare signed upload URL for a single image
 */
async function prepareSignedUpload(
  entityId: string,
  uri: string,
  index: number
): Promise<SignedUploadData> {
  console.log(`  [${index + 1}] Preparing upload for: ${uri}`);

  const filename = extractFilename(uri) || `image_${index}_${Date.now()}.jpg`;
  const blob = await fetchImageBlob(uri);

  console.log(`  [${index + 1}] Got blob (${blob.size} bytes), requesting signed URL...`);
  const { uploadUrl, publicUrl } = await getSignedUrl(entityId, filename, blob.size);

  console.log(`  [${index + 1}] Signed URL received`);

  return {
    localUri: uri,
    signedUrl: uploadUrl,
    publicUrl,
    blob,
  };
}

/**
 * Fetch image as blob from local URI
 */
async function fetchImageBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`Failed to read image: ${response.status}`);
  }

  return response.blob();
}

/**
 * Get signed URL from backend
 */
async function getSignedUrl(
  entityId: string,
  filename: string,
  sizeBytes: number
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const result = await apiClient.getSignedUrl({
    entityType: 'pin',
    entityId,
    filename,
    contentType: 'image/jpeg',
    sizeBytes,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to get signed URL: ${result.error}`);
  }

  return {
    uploadUrl: result.data.uploadUrl,
    publicUrl: result.data.publicUrl,
  };
}

/**
 * Upload all images to their signed URLs
 */
async function uploadAllImages(signedData: SignedUploadData[]): Promise<string[]> {
  console.log(`⬆️  Starting upload of ${signedData.length} images to storage...`);

  const results = await Promise.all(
    signedData.map(({ signedUrl, publicUrl, blob }, index) =>
      uploadSingleImage(signedUrl, publicUrl, blob, index)
    )
  );

  console.log(`✅ All ${results.length} images uploaded successfully`);
  return results;
}

/**
 * Upload a single image to its signed URL
 */
async function uploadSingleImage(
  signedUrl: string,
  publicUrl: string,
  blob: Blob,
  index: number
): Promise<string> {
  console.log(`  [${index + 1}] Uploading ${(blob.size / 1024).toFixed(1)}KB to storage...`);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for image upload

  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/jpeg' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    console.log(`  [${index + 1}] ✓ Upload complete`);
    return publicUrl;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`  [${index + 1}] ⏱️ Upload timed out after 60s`);
      throw new Error('Image upload timed out. Please check your internet connection.');
    }

    console.error(`  [${index + 1}] ❌ Upload failed:`, error);
    throw error;
  }
}
