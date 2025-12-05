export interface SyncItemRequest {
  idempotencyKey: string;
  entityType: 'pin' | 'form';
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  deviceId: string;
  timestamp: string;
}

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  message?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SyncItemResponse {
  success: boolean;
  data: Record<string, unknown> | { id: string; deleted: boolean };
  idempotencyKey: string;
  timestamp: string;
}
