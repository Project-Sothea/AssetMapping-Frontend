import { apiClient } from '~/services/apiClient';

export const uploadToRemote = async (
  uri: string,
  fileName: string,
  entityId?: string
): Promise<string> => {
  console.log('🔵 Starting image upload:');
  console.log('  URI:', uri);
  console.log('  Filename:', fileName);
  console.log('  Entity ID:', entityId);

  try {
    // Get file info
    const response = await fetch(uri);
    const blob = await response.blob();
    console.log('  File size:', blob.size, 'bytes');
    console.log('  File type:', blob.type);

    // Get signed upload URL from backend
    console.log('🔵 Requesting signed URL from backend...');
    const signedUrlResponse = await apiClient.getSignedUrl({
      entityType: 'pin',
      entityId: entityId || 'unknown',
      filename: fileName,
      contentType: blob.type || 'image/jpeg',
      sizeBytes: blob.size, // Add file size for validation
    });

    if (!signedUrlResponse.success || !signedUrlResponse.data) {
      const errorMsg = signedUrlResponse.error || 'Failed to get signed upload URL';
      console.error('❌ Signed URL request failed:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ Got signed URL:', signedUrlResponse.data.uploadUrl.substring(0, 50) + '...');

    // Upload to signed URL
    console.log('🔵 Uploading to storage...');
    const uploadResponse = await fetch(signedUrlResponse.data.uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => 'Unable to read error');
      console.error('❌ Upload failed:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
      });
      throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
    }

    console.log('✅ Upload successful!');
    console.log('  Public URL:', signedUrlResponse.data.publicUrl);
    return signedUrlResponse.data.publicUrl;
  } catch (error: any) {
    console.error('❌ Image upload error:', error.message);
    throw error;
  }
};

// Delete image via backend API
export const deleteImage = async (
  imageUrl: string,
  entityType: 'pin' | 'form',
  entityId: string
): Promise<boolean> => {
  try {
    const response = await apiClient.deleteImage(imageUrl, entityType, entityId);
    return response.success;
  } catch (err) {
    console.error('Failed to delete image:', err);
    return false;
  }
};

// List files in bucket via backend API
export async function listFilesInBucket(
  entityId: string,
  entityType: 'pin' | 'form' = 'pin'
): Promise<string[]> {
  try {
    const response = await apiClient.listImages(entityType, entityId);

    if (!response.success || !response.data) {
      return [];
    }

    return response.data;
  } catch (err) {
    console.warn('Failed to list files:', err);
    return [];
  }
}
