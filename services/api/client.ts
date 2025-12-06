import type { ApiResponse } from '@assetmapping/shared-types';

import { getApiUrl } from '../apiUrl';

let cachedBaseUrl: string | null = null;

async function resolveBaseUrl(): Promise<string> {
  if (!cachedBaseUrl) {
    cachedBaseUrl = await getApiUrl();
    if (!cachedBaseUrl) {
      throw new Error(
        'API URL not configured. Please set the backend API URL in the app settings.'
      );
    }
  }
  return cachedBaseUrl;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<ApiResponse<T>> {
  try {
    const baseUrl = await resolveBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`API request timed out after ${timeoutMs / 1000}s:`, endpoint);
        return {
          success: false,
          error: 'Request timed out. Please check your internet connection.',
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
