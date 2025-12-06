import type { Pin } from '~/db/schema';

import { request } from './client';
import type { ApiResponse } from './types';

const BULK_TIMEOUT_MS = 120000;
const DEFAULT_TIMEOUT_MS = 30000;

export async function fetchPins(): Promise<ApiResponse<Pin[]>> {
  return request<Pin[]>('/api/pins', { method: 'GET' }, BULK_TIMEOUT_MS);
}

export async function fetchPin(pinId: string): Promise<ApiResponse<Pin>> {
  return request<Pin>(`/api/pins/${pinId}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
}

export async function fetchPinsSince(timestamp: number): Promise<ApiResponse<Pin[]>> {
  const qs = new URLSearchParams({ timestamp: String(timestamp) }).toString();
  return request<Pin[]>(`/api/pins/since?${qs}`, { method: 'GET' }, BULK_TIMEOUT_MS);
}
