import * as FileSystem from 'expo-file-system';

export async function ensureDirectoryExists(path: string): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  } catch (error) {
    console.warn(`Failed to create directory ${path}:`, error);
  }
}

export async function deleteFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function copyFile(from: string, to: string): Promise<void> {
  await FileSystem.copyAsync({ from, to });
}

export async function downloadFile(from: string, to: string): Promise<void> {
  const res = await FileSystem.downloadAsync(from, to);
  if (res.status !== 200) throw new Error(`Download failed: HTTP ${res.status}`);
}

/**
 * Validate that image files exist on filesystem
 */
export async function validateFilesExist(uris: string[]): Promise<string[]> {
  if (uris.length === 0) return [];

  const validUris: string[] = [];

  console.log(`Validating ${uris.length} image files...`);

  for (const uri of uris) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        validUris.push(uri);
      } else {
        console.warn(`  ✗ File missing: ${uri}`);
      }
    } catch (error) {
      console.warn(`  ✗ Validation error: ${uri}`, error);
    }
  }

  const skipped = uris.length - validUris.length;
  if (skipped > 0) {
    console.log(`  ${validUris.length} valid, ${skipped} skipped`);
  }

  return validUris;
}
