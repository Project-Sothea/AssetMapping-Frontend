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

export interface SignedUrlData {
  uploadUrl: string;
  publicUrl: string;
  token: string;
  expiresAt: string;
}

export interface ValidationResponse {
  success: boolean;
  data: Record<string, unknown>;
  message: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
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
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Sync API methods
  async syncItem(request: SyncItemRequest): Promise<ApiResponse<SyncItemResponse['data']>> {
    const response = await this.request<SyncItemResponse>('/api/sync/item', {
      method: 'POST',
      body: JSON.stringify(request),
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

  async batchSync(items: SyncItemRequest[]): Promise<ApiResponse<BatchSyncResponse>> {
    return this.request<BatchSyncResponse>('/api/sync/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Fetch API methods
  async fetchPins(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request<Record<string, unknown>[]>('/api/pins', {
      method: 'GET',
    });
  }

  async fetchForms(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request<Record<string, unknown>[]>('/api/forms', {
      method: 'GET',
    });
  }

  // Image API methods
  async getSignedUrl(request: {
    entityType: 'pin' | 'form';
    entityId: string;
    filename: string;
    contentType?: string;
    sizeBytes?: number;
  }): Promise<ApiResponse<SignedUrlData>> {
    const response = await this.request<SignedUrlData>('/api/images/signed-url', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
      };
    }

    return {
      success: false,
      error: response.error,
    };
  }

  // Validation API methods
  async validatePin(
    pinData: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await this.request<ValidationResponse>('/api/pins/validate', {
      method: 'POST',
      body: JSON.stringify(pinData),
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

  async validateForm(
    formData: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await this.request<ValidationResponse>('/api/forms/validate', {
      method: 'POST',
      body: JSON.stringify(formData),
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

  // Image API methods
  async deleteImage(
    imageUrl: string,
    entityType: 'pin' | 'form',
    entityId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>('/api/images', {
      method: 'DELETE',
      body: JSON.stringify({ imageUrl, entityType, entityId }),
    });
  }

  async listImages(entityType: 'pin' | 'form', entityId: string): Promise<ApiResponse<string[]>> {
    return this.request<string[]>(`/api/images/${entityType}/${entityId}`, {
      method: 'GET',
    });
  }

  async processImage(
    imageUrl: string,
    entityType: 'pin' | 'form',
    entityId: string
  ): Promise<ApiResponse<{ imageUrl: string }>> {
    return this.request<{ imageUrl: string }>('/api/images/process', {
      method: 'POST',
      body: JSON.stringify({ imageUrl, entityType, entityId }),
    });
  }

  // Health check
  async healthCheck(): Promise<
    ApiResponse<{ status: string; uptime: number; environment: string; timestamp: string }>
  > {
    return this.request('/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
