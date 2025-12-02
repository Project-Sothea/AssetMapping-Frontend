import { getApiUrl } from './apiUrl';

// API Request types
export interface SyncItemRequest {
  idempotencyKey: string;
  entityType: 'pin' | 'form';
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  deviceId: string;
  timestamp: string;
}

export interface BatchSyncResult {
  success: boolean;
  idempotencyKey: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface SyncItemResponse {
  success: boolean;
  data: Record<string, unknown> | { id: string; deleted: boolean };
  idempotencyKey: string;
  timestamp: string;
}

export interface BatchSyncResponse {
  success: boolean;
  results: BatchSyncResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  timestamp: string;
}

export interface ValidationResponse {
  success: boolean;
  data: Record<string, unknown>;
  message: string;
}

class ApiClient {
  private baseUrl: string | null = null;

  private async getBaseUrl(): Promise<string> {
    if (!this.baseUrl) {
      this.baseUrl = await getApiUrl();
      if (!this.baseUrl) {
        throw new Error(
          'API URL not configured. Please set the backend API URL in the app settings.'
        );
      }
    }
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<ApiResponse<T>> {
    try {
      const baseUrl = await this.getBaseUrl();
      const url = `${baseUrl}${endpoint}`;

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // Don't set Content-Type for FormData - browser sets it with boundary
        const headers: HeadersInit =
          options.body instanceof FormData
            ? { ...options.headers }
            : {
                'Content-Type': 'application/json',
                ...options.headers,
              };

        const response = await fetch(url, {
          ...options,
          headers,
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

  // Sync API methods
  async syncItem(body: FormData): Promise<ApiResponse<SyncItemResponse['data']>> {
    const response = await this.request<SyncItemResponse>('/api/sync/item', {
      method: 'POST',
      body,
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: response.error,
    };
  }

  // Fetch API methods
  async fetchPins(): Promise<ApiResponse<Record<string, unknown>[]>> {
    // Longer timeout for bulk data fetch (2 minutes)
    return this.request<Record<string, unknown>[]>('/api/pins', { method: 'GET' }, 120000);
  }

  async fetchPin(pinId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>(`/api/pins/${pinId}`, { method: 'GET' }, 30000);
  }

  async fetchPinsSince(timestamp: number): Promise<ApiResponse<Record<string, unknown>[]>> {
    // Longer timeout for bulk data fetch (2 minutes)
    return this.request<Record<string, unknown>[]>(
      `/api/pins/since/${timestamp}`,
      { method: 'GET' },
      120000
    );
  }

  async fetchForms(): Promise<ApiResponse<Record<string, unknown>[]>> {
    // Longer timeout for bulk data fetch (2 minutes)
    return this.request<Record<string, unknown>[]>('/api/forms', { method: 'GET' }, 120000);
  }

  async fetchForm(formId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>(`/api/forms/${formId}`, { method: 'GET' }, 30000);
  }

  async fetchFormsSince(timestamp: number): Promise<ApiResponse<Record<string, unknown>[]>> {
    // Longer timeout for bulk data fetch (2 minutes)
    return this.request<Record<string, unknown>[]>(
      `/api/forms/since/${timestamp}`,
      { method: 'GET' },
      120000
    );
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
