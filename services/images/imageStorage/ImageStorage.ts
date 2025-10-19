// imageStorage.ts

import { copyFile, downloadFile, deleteFile } from './fileSystemsUtils';
import { isLocalUri, isRemoteUri, generateUniqueFilename } from '../utils/uriUtils';
import { cleanupEmptyDirectory, getPinDirectoryPath } from './directoryUtils';

// --- Interfaces ---
export interface Result {
  success: string[];
  fail: string[];
}

export interface DownloadResult {
  localImages: string[];
  images: string[];
  fail: string[];
}

/**
 * @argument newUris full path as '${directory}${filename}`
 */
export async function saveNewImages(pinId: string, newUris: string[]): Promise<Result> {
  if (!newUris) {
    return { success: [], fail: [] };
  }
  const pinDirName = await getPinDirectoryPath(pinId);

  return await processBatchOperation(newUris, async (uri) => saveImage(uri, pinDirName));
}

export async function deleteImages(pinId: string, filenames: string[]): Promise<Result> {
  if (!filenames?.length) return { success: [], fail: [] };

  const pinDirName = await getPinDirectoryPath(pinId);

  const result = await processBatchOperation(filenames, async (filename) => {
    const uri = `${pinDirName}${filename}`;
    await deleteFile(uri);
    return uri;
  });

  await cleanupEmptyDirectory(pinDirName);

  return result;
}

// --- Internal helpers ---
async function saveImage(imageUri: string, directory: string): Promise<string> {
  const filename = generateUniqueFilename();
  const localUri = `${directory}${filename}`;
  await copyOrDownloadImage(imageUri, localUri);
  return localUri;
}

/**
 * copy is device -> storage,
 * download is remote -> storage
 * @param sourceUri local uri from device / remote uri
 * @param destUri the full uri of the image to download to
 * @returns
 */
async function copyOrDownloadImage(sourceUri: string, destUri: string): Promise<void> {
  if (isLocalUri(sourceUri)) return copyFile(sourceUri, destUri);
  if (isRemoteUri(sourceUri)) return downloadFile(sourceUri, destUri);
  throw new Error(`Unsupported URI: ${sourceUri}`);
}

async function processBatchOperation<T>(
  items: T[],
  op: (item: T) => Promise<string>
): Promise<{ success: string[]; fail: T[] }> {
  const success: string[] = [];
  const fail: T[] = [];

  for (const item of items) {
    try {
      success.push(await op(item));
    } catch {
      fail.push(item);
    }
  }
  return { success, fail };
}
