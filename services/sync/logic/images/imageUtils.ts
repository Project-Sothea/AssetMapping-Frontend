/**
 * Image Utilities
 *
 * Pure utility functions for image handling:
 * - Filename generation
 * - URI normalization
 * - Path extraction
 *
 * No side effects, no dependencies on external services
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique filename for an image
 * @returns Unique filename with .jpg extension (e.g., "uuid-v4.jpg")
 */
export function generateUniqueFilename(): string {
  return `${uuidv4()}.jpg`;
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
 * Extract filename from a local file URI
 *
 * @param localUri - Full local file URI (e.g., "file:///path/to/image.jpg")
 * @returns Filename only (e.g., "image.jpg") or null if extraction fails
 */
export function extractFilename(localUri: string): string | null {
  if (!localUri) return null;

  // Remove 'file://' prefix if present
  const cleanedUri = localUri.startsWith('file://') ? localUri.slice(7) : localUri;

  // Find the last slash position
  const lastSlashIndex = cleanedUri.lastIndexOf('/');

  if (lastSlashIndex === -1) {
    return null; // No slash found
  }

  // Extract filename after the last slash
  return cleanedUri.substring(lastSlashIndex + 1);
}

/**
 * Check if a URI is a remote URL
 * @param uri - URI to check
 * @returns true if HTTP/HTTPS URL, false otherwise
 */
export function isRemoteUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

/**
 * Check if a URI is a local file
 * @param uri - URI to check
 * @returns true if file:// or absolute path, false otherwise
 */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

/**
 * Build a directory path for pin images
 * @param baseDirectory - Base directory (e.g., FileSystem.documentDirectory)
 * @param pinId - Pin identifier
 * @returns Full directory path
 */
export function buildPinImageDirectory(baseDirectory: string, pinId: string): string {
  return `${baseDirectory}pins/${pinId}/`;
}
