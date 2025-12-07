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
  let baseUrl: string;

  try {
    baseUrl = await resolveBaseUrl();
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }

  const url = `${baseUrl}${endpoint}`;
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
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`API request timed out after ${timeoutMs / 1000}s:`, endpoint);
      return {
        success: false,
        error: 'Request timed out. Please check your internet connection.',
      };
    }
    console.error('API request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
