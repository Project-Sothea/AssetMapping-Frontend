import * as FileSystem from 'expo-file-system';
import { ensureDirectoryExists } from './fileSystemsUtils';

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

function buildPinDirName(pinId: string): string {
  return `${BASE_DIRECTORY}pins/${pinId}/`;
}
