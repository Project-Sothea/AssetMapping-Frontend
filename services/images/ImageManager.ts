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
import { getApiUrl } from '../apiUrl';

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

  // Already saved? Return filename
  if (imageUri.includes(pinDir.uri)) {
    const filename = imageUri.split('/').pop()!;
    console.log(`📍 Already in pin dir, returning: ${filename}`);
    return filename;
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
    file.delete();
    console.log('🗑️ Deleted:', filename);
  } catch (error) {
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
  const apiUrl = await getApiUrl();
  if (!apiUrl) return null;
  return `${apiUrl}/uploads/pin/${pinId}/${filename}`;
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
