import { downloadFile } from './fileSystemsUtils';
import { isLocalUri, isRemoteUri, generateUniqueFilename } from '../utils/uriUtils';
import { Directory, File, Paths } from 'expo-file-system/next';
import { fetch } from 'expo/fetch';

// --- Interfaces ---
export interface Result {
  success: string[];
  fail: string[];
}

/**
 * @argument newUris full path as '${directory}${filename}`
 */
export async function saveNewImages(pinId: string, newUris: string[]): Promise<Result> {
  if (!newUris) return { success: [], fail: [] };
  const dir = new Directory(Paths.document, 'pins', pinId);
  try {
    dir.create({ intermediates: true });
  } catch {
    // already exists or not creatable; continue
  }
  return processBatchOperation(newUris, async (uri) => saveImage(uri, dir));
}

/**
 *
 * @param pinId
 * @param filenames the full URIs
 * @returns
 */
export async function deleteImages(filenames: string[]): Promise<Result> {
  if (!filenames?.length) return { success: [], fail: [] };
  return processBatchOperation(filenames, async (uri) => {
    // Parse local file into File object; remote deletions unsupported here.
    if (!isLocalUri(uri)) throw new Error('Can only delete local URIs');
    const file = fileFromLocalUri(uri);
    try {
      file.delete();
    } catch {
      throw new Error('delete failed');
    }
    return uri;
  });
}

// --- Internal helpers ---
async function saveImage(imageUri: string, dir: Directory): Promise<string> {
  // Check if the image is already in the canonical directory
  const dirPath = dir.uri;
  if (isLocalUri(imageUri) && imageUri.includes(dirPath)) {
    // Image is already in the correct location, return as-is
    console.log(`📍 Image already in canonical location: ${imageUri}`);
    return imageUri;
  }

  const filename = isRemoteUri(imageUri)
    ? imageUri.split('/').pop() || generateUniqueFilename()
    : generateUniqueFilename();
  if (isRemoteUri(imageUri)) {
    const downloaded = await downloadFile(imageUri, dir, filename);
    return downloaded.uri;
  }
  if (isLocalUri(imageUri)) {
    // Read local file bytes via fetch and write to our canonical file
    const destFile = new File(dir, filename);
    destFile.create();
    const res = await fetch(imageUri);
    if (!res.ok) throw new Error(`copy failed: ${res.status}`);
    const bytes = await res.bytes();
    destFile.write(bytes);
    return destFile.uri;
  }
  throw new Error(`Unsupported URI: ${imageUri}`);
}

/**
 * copy is device -> storage,
 * download is remote -> storage
 * @param sourceUri local uri from device / remote uri
 * @param destUri the full uri of the image to download to
 * @returns
 */
// Parse a local file URI into a File instance under an inferred root Directory.
function fileFromLocalUri(uri: string): File {
  // Remove file:// prefix if present
  let path = uri.startsWith('file://') ? uri.slice(7) : uri;

  // Determine root: document vs cache
  const lower = path.toLowerCase();
  const rootPath = lower.includes('cache') ? Paths.cache : Paths.document;

  // Extract the path relative to the root
  // Expected format: /data/user/0/com.app/files/pins/PIN_ID/IMAGE.jpg
  const rootStr = rootPath.toString();
  let relativePath = path;

  // If the path includes the root path, extract the relative portion
  if (path.includes(rootStr)) {
    relativePath = path.substring(path.indexOf(rootStr) + rootStr.length);
    // Remove leading slash
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }
  }

  // Split the relative path into segments
  const segments = relativePath.split('/').filter(Boolean);

  if (segments.length === 0) {
    throw new Error(`Invalid URI: ${uri}`);
  }

  // The last segment is the filename
  const filename = segments.pop() || 'unknown';

  // Build the directory from remaining segments
  const dir = segments.length > 0 ? new Directory(rootPath, ...segments) : new Directory(rootPath);

  return new File(dir, filename);
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
