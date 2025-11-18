/**
 * Image URL Utilities
 *
 * Handles conversion between relative paths and full URLs
 * for resilience to server IP changes
 */

import { getApiUrl } from '~/services/apiUrl';

/**
 * Check if a string is a relative path (not a full URL)
 */
export function isRelativePath(path: string): boolean {
  if (!path) return false;
  return !path.startsWith('http://') && !path.startsWith('https://');
}

/**
 * Convert relative path to full URL using current API URL
 * If already a full URL, returns as-is for backward compatibility
 *
 * @param pathOrUrl - Relative path like "pin/123/image.jpg" or full URL
 * @returns Full URL like "http://192.168.18.22:3000/uploads/pin/123/image.jpg"
 */
export async function getImageUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;

  // If already a full URL, return as-is (backward compatibility)
  if (!isRelativePath(pathOrUrl)) {
    return pathOrUrl;
  }

  // It's a relative path - construct full URL
  const apiUrl = await getApiUrl();
  if (!apiUrl) {
    console.warn('⚠️ API URL not configured, cannot construct image URL');
    return null;
  }

  // Ensure no double slashes and remove leading slash
  const cleanApiUrl = apiUrl.replace(/\/$/, '');
  let cleanPath = pathOrUrl.replace(/^\//, '');

  // Prepend 'uploads/' if not already present (backend returns relative paths without /uploads)
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }

  return `${cleanApiUrl}/${cleanPath}`;
}

/**
 * Convert array of relative paths to full URLs
 *
 * @param pathsOrUrls - Array of relative paths or full URLs
 * @returns Array of full URLs (nulls filtered out)
 */
export async function getImageUrls(pathsOrUrls: (string | null | undefined)[]): Promise<string[]> {
  const urls = await Promise.all(pathsOrUrls.map((path) => getImageUrl(path)));

  return urls.filter((url): url is string => url !== null);
}
