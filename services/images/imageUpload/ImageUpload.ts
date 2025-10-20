/**
 * Image Upload Utility
 * Handles uploading local images to Supabase storage
 */

import { apiClient } from '~/services/apiClient';
import { extractFilename } from '../utils/uriUtils';

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
  const uris = normalizeUrisInput(localUris);

  if (uris.length === 0) return [];

  console.log(`📤 Uploading ${uris.length} images for ${entityId}`);

  const signedData = await prepareSignedUploads(entityId, uris);
  const uploadedUrls = await uploadAllImages(signedData);

  console.log(`✅ Uploaded ${uploadedUrls.length} images`);
  return uploadedUrls;
}

// ========== Helper Functions ==========

/**
 * Normalize various input types to a string array
 */
function normalizeUrisInput(localUris: string[] | string | null | undefined): string[] {
  if (!localUris) return [];

  if (typeof localUris === 'string') {
    try {
      return JSON.parse(localUris);
    } catch {
      // If it's a single URI string, wrap in array
      return [localUris];
    }
  }

  if (Array.isArray(localUris)) {
    return localUris;
  }

  return [];
}

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
  const filename = extractFilename(uri) || `image_${index}_${Date.now()}.jpg`;
  const blob = await fetchImageBlob(uri);
  const { uploadUrl, publicUrl } = await getSignedUrl(entityId, filename, blob.size);

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
  return Promise.all(
    signedData.map(({ signedUrl, publicUrl, blob }) =>
      uploadSingleImage(signedUrl, publicUrl, blob)
    )
  );
}

/**
 * Upload a single image to its signed URL
 */
async function uploadSingleImage(
  signedUrl: string,
  publicUrl: string,
  blob: Blob
): Promise<string> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': 'image/jpeg' },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return publicUrl;
}
