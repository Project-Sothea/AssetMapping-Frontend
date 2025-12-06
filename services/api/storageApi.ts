import type { ApiResponse, StorageDeleteResult } from '@assetmapping/shared-types';

import { request } from './client';

export async function getUploadUrl(key: string, contentType: string): Promise<ApiResponse<string>> {
  const qs = new URLSearchParams({ key, mimeType: contentType }).toString();
  return request<string>(`/api/storage/upload-url?${qs}`, {
    method: 'GET',
  });
}

export async function getDownloadUrl(key: string): Promise<ApiResponse<string>> {
  const qs = new URLSearchParams({ key }).toString();
  return request<string>(`/api/storage/download-url?${qs}`, {
    method: 'GET',
  });
}

export async function deleteObjects(keys: string[]): Promise<ApiResponse<StorageDeleteResult>> {
  return request<StorageDeleteResult>('/api/storage/objects', {
    method: 'DELETE',
    body: JSON.stringify({ keys }),
  });
}
