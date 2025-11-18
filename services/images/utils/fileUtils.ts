/**
 * File utilities for React Native FormData
 */

import { extractFilename } from './uriUtils';

export interface FileForUpload {
  uri: string;
  name: string;
  type: string;
}

/**
 * Prepare file metadata for React Native FormData
 * React Native requires { uri, name, type } format instead of File/Blob
 */
export function uriToFile(uri: string, index: number = 0): FileForUpload {
  const filename = extractFilename(uri) || `image_${index}_${Date.now()}.jpg`;

  return {
    uri,
    name: filename,
    type: 'image/jpeg',
  };
}

/**
 * Convert multiple local URIs to file metadata for FormData
 */
export function urisToFiles(uris: string[]): FileForUpload[] {
  return uris.map((uri, index) => uriToFile(uri, index));
}
