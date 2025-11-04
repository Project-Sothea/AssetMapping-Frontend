import { v4 as uuidv4 } from 'uuid';
import { parseJsonArray } from '~/shared/utils/parsing';

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

export function isRemoteUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
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

/**
 * Parse localImages field (JSON string or array) into array of URIs
 */
export function parseImageUris(localImages: string | string[] | undefined | null): string[] {
  return parseJsonArray(localImages);
}

/**
 * Check if two image URI arrays are identical
 */
export function areUrisEqual(uris1: string[], uris2: string[]): boolean {
  if (uris1.length !== uris2.length) return false;
  const sorted1 = [...uris1].sort();
  const sorted2 = [...uris2].sort();
  return JSON.stringify(sorted1) === JSON.stringify(sorted2);
}
