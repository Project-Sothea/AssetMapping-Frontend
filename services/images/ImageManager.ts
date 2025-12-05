/**
 * ImageManager - Simple filename-based image handling
 *
 * Key concept: Store only FILENAMES (UUIDs) in database
 * Construct paths dynamically:
 * - Local: /pins/{pinId}/{filename}
 * - Remote: {apiUrl}/uploads/pin/{pinId}/{filename}
 *
 * Workflow:
 * 1. User picks → save with UUID filename → store filename in DB
 * 2. Display → construct local path from filename
 * 3. Sync → upload by filename, backend uses same filename
 * 4. Delete → easy to track (compare filename arrays)
 */

import { Directory, File, Paths } from 'expo-file-system/next';
import * as ImagePicker from 'expo-image-picker';
import { fetch } from 'expo/fetch';
import { getDownloadUrl } from '../api/storageApi';

// ============================================
// PICK IMAGE
// ============================================

export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access media library is required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

// ============================================
// SAVE LOCALLY
// ============================================

export async function saveImageLocally(pinId: string, imageUri: string): Promise<string> {
  console.log(`💾 saveImageLocally: pinId=${pinId}, uri=${imageUri}`);

  const pinDir = new Directory(Paths.document, 'pins', pinId);
  console.log(`📁 Pin dir: ${pinDir.uri}, exists=${pinDir.exists}`);

  if (!pinDir.exists) {
    pinDir.create({ intermediates: true });
    console.log(`✅ Created directory: ${pinDir.uri}`);
  }

  // Extract filename from ImagePicker URI (already has UUID)
  const filename = imageUri.split('/').pop()!;
  console.log(`🆕 Saving new image as: ${filename}`);
  const destFile = new File(pinDir, filename);

  destFile.create();
  const response = await fetch(imageUri);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const bytes = await response.bytes();
  destFile.write(bytes);
  return filename;
}

// ============================================
// DELETE LOCALLY
// ============================================

/**
 * Delete image by filename
 */
export async function deleteImageByFilename(pinId: string, filename: string): Promise<void> {
  try {
    const pinDir = new Directory(Paths.document, 'pins', pinId);
    const file = new File(pinDir, filename);
    // If file is already gone, treat as success
    if ((file as any).exists === false) {
      console.log('🗑️ Already deleted or missing:', filename);
      return;
    }
    file.delete();
    console.log('🗑️ Deleted:', filename);
  } catch (error) {
    // Ignore missing file errors, otherwise bubble up
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log('🗑️ Already deleted or missing:', filename);
      return;
    }
    console.error('Failed to delete:', filename, error);
    throw error;
  }
}

/**
 * Delete multiple images by filename
 */
export async function deleteImagesByFilename(pinId: string, filenames: string[]): Promise<void> {
  for (const filename of filenames) {
    try {
      await deleteImageByFilename(pinId, filename);
    } catch {
      // Continue with other files
    }
  }
}

// ============================================
// UTILITIES - FILENAME BASED
// ============================================

/**
 * Parse image filenames from database
 */
export function parseImageFilenames(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get local file path for a filename
 */
export function getLocalPath(pinId: string, filename: string): string {
  const pinDir = new Directory(Paths.document, 'pins', pinId);
  const file = new File(pinDir, filename);
  return file.uri;
}

/**
 * Get remote URL for a filename
 */
export async function getRemoteUrl(pinId: string, filename: string): Promise<string | null> {
  try {
    const key = `pins/${pinId}/${filename}`;
    const response = await getDownloadUrl(key);

    if (response.success && response.data) {
      return response.data;
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch remote image URL from storage', error);
  }

  return null;
}

/**
 * Download a remote image and cache it locally for offline use.
 * Returns the local URI on success, or null on failure.
 */
export async function cacheRemoteImage(
  pinId: string,
  filename: string,
  remoteUrl: string
): Promise<string | null> {
  try {
    const pinDir = new Directory(Paths.document, 'pins', pinId);
    if (!pinDir.exists) {
      pinDir.create({ intermediates: true });
    }

    const destFile = new File(pinDir, filename);
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    destFile.create();
    const bytes = await response.bytes();
    destFile.write(bytes);
    return destFile.uri;
  } catch (error) {
    console.warn('⚠️ Failed to cache remote image locally', { pinId, filename, error });
    return null;
  }
}

/**
 * Check if file exists locally
 */
export function fileExistsLocally(pinId: string, filename: string): boolean {
  try {
    const pinDir = new Directory(Paths.document, 'pins', pinId);
    const file = new File(pinDir, filename);
    return (file as any).exists ?? false;
  } catch {
    return false;
  }
}
