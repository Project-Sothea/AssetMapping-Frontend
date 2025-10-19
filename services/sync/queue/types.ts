// ==================== Types ====================

export type Operation = 'create' | 'update' | 'delete';
export type EntityType = 'pin' | 'form';

export interface QueueMetrics {
  pending: number;
  failed: number;
  completed: number;
}
