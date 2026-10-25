// ==================== Types ====================

export type Operation = 'create' | 'update' | 'delete';
export type EntityType = 'pin' | 'form';

export interface QueueMetrics {
  pending: number;
  failed: number;
  completed: number;
}

export interface UploadResult {
  uploaded: number;
  failed: number;
  blocked: number;
  remaining: number;
  errors: { entityId: string; entityType: string; name: string; message: string }[];
}
