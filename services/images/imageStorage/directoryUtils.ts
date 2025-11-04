import * as FileSystem from 'expo-file-system';
import { ensureDirectoryExists, deleteFile } from './fileSystemsUtils';

/**
 * Storage Location: documentDirectory
 * 
 * WHY documentDirectory (Current Choice):
 * ✅ PERSISTENT - Never deleted by system
 * ✅ BACKED UP - Included in iCloud/iTunes backups
 * ✅ SAFE - Files survive app updates
 * ✅ USER DATA - Appropriate for user-generated content
 * 
 * Alternative: cacheDirectory
 * ❌ TEMPORARY - System can delete when storage is low
 * ❌ NOT BACKED UP - Lost if device is restored
 * ✅ Faster (no backup overhead)
 * ✅ Good for truly temporary/re-downloadable content
 * 
 * DECISION: documentDirectory is CORRECT for offline-first user photos
 */
const BASE_DIRECTORY = FileSystem.documentDirectory || '';

export async function getPinDirectoryPath(pinId: string): Promise<string> {
  const path = buildPinDirName(pinId);
  console.log(`📁 Ensuring directory exists: ${path}`);
  await ensureDirectoryExists(path);

  // Verify the directory was created
  const dirInfo = await FileSystem.getInfoAsync(path);
  if (!dirInfo.exists) {
    console.error(`   ✗ Directory not found after creation: ${path}`);
    throw new Error(`Failed to create directory: ${path}`);
  }

  console.log(`   ✓ Directory ready: ${path}`);
  return path;
}

export async function cleanupEmptyDirectory(directory: string): Promise<void> {
  try {
    await deleteFile(directory);
  } catch {
    // ignore
  }
}

function buildPinDirName(pinId: string): string {
  return `${BASE_DIRECTORY}pins/${pinId}/`;
}
