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
