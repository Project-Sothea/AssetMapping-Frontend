import * as FileSystem from 'expo-file-system';
import { ensureDirectoryExists, deleteFile } from './fileSystemsUtils';

const BASE_DIRECTORY = FileSystem.documentDirectory || '';

export async function getPinDirectoryPath(pinId: string): Promise<string> {
  const path = buildPinDirName(pinId);
  await ensureDirectoryExists(path);
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
