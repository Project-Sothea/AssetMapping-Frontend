import type { ApiResponse, SyncItemRequest, SyncResult } from '@assetmapping/shared-types';

import { request } from './client';

export async function sync(body: SyncItemRequest): Promise<ApiResponse<SyncResult>> {
  return request<SyncResult>('/api/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
