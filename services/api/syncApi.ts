import type { Pin, Form } from '~/db/schema';

import { request } from './client';
import type { ApiResponse, SyncItemRequest } from './types';

export type { SyncItemRequest } from './types';

type SyncResult = Pin | Form | { id: string; deleted: boolean };

export async function sync(body: SyncItemRequest): Promise<ApiResponse<SyncResult>> {
  return request<SyncResult>('/api/sync', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
