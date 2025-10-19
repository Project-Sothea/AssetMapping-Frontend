import { v4 as uuidv4 } from 'uuid';

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

export function isRemoteUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

/**
 * Ensure a URI has the proper file:// scheme
 * Handles various URI formats and normalizes them
 *
 * @param uri - The URI to normalize
 * @returns Normalized URI with proper scheme
 */
export function normalizeFileUri(uri: string): string {
  if (!uri) return uri;

  // Already has a scheme - return as is
  if (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  ) {
    return uri;
  }

  // Absolute path without scheme - add file:// prefix
  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }

  return uri;
}

/**
 * Generate a unique filename for an image
 * @returns Unique filename with .jpg extension (e.g., "uuid-v4.jpg")
 */
export function generateUniqueFilename(): string {
  return `${uuidv4()}.jpg`;
}

/**
 * Extract filename from local URI
 */
export function extractFilename(uri: string): string {
  if (!uri) return `image_${Date.now()}.jpg`;
  const cleaned = uri.startsWith('file://') ? uri.slice(7) : uri;
  const lastSlash = cleaned.lastIndexOf('/');
  return lastSlash === -1 ? `image_${Date.now()}.jpg` : cleaned.substring(lastSlash + 1);
}
