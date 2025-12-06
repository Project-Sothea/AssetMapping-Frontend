import type { Form } from '~/db/schema';

import { request } from './client';
import type { ApiResponse } from './types';

const BULK_TIMEOUT_MS = 120000;
const DEFAULT_TIMEOUT_MS = 30000;

export async function fetchForms(): Promise<ApiResponse<Form[]>> {
  return request<Form[]>('/api/forms', { method: 'GET' }, BULK_TIMEOUT_MS);
}

export async function fetchForm(formId: string): Promise<ApiResponse<Form>> {
  return request<Form>(`/api/forms/${formId}`, { method: 'GET' }, DEFAULT_TIMEOUT_MS);
}

export async function fetchFormsSince(timestamp: number): Promise<ApiResponse<Form[]>> {
  const qs = new URLSearchParams({ timestamp: String(timestamp) }).toString();
  return request<Form[]>(`/api/forms/since?${qs}`, { method: 'GET' }, BULK_TIMEOUT_MS);
}
