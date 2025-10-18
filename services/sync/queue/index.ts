/**
 * Sync Queue System
 *
 * Provides offline-first queue for synchronization operations
 * with idempotency, retry logic, and event tracking.
 */

export { SyncQueueManager } from './SyncQueueManager';

export type {
  QueueOperationInput,
  QueueOperation,
  QueueStatus,
  OperationType,
  EntityType,
  ProcessResult,
  BatchProcessResult,
  QueueMetrics,
  QueueConfig,
  QueueEvent,
  QueueEventListener,
  IdempotencyKeyComponents,
} from './types';

export {
  DEFAULT_QUEUE_CONFIG,
  BACKOFF_DELAYS,
  QueueError,
  IdempotencyError,
  MaxRetriesError,
} from './types';

export {
  generateIdempotencyKey,
  getDeviceId,
  calculateBackoffDelay,
  shouldRetry,
  validateOperationInput,
  formatOperation,
  formatDuration,
  isNetworkError,
  isConflictError,
  getUserFriendlyError,
} from './utils';

// UI Integration Helpers
export {
  enqueuePinCreate,
  enqueuePinUpdate,
  enqueuePinDelete,
  enqueueFormSubmit,
  enqueueFormUpdate,
  enqueueFormDelete,
  processQueueNow,
  getQueueHealth,
  subscribeToQueueEvents,
  retryFailedOperations,
  clearFailedOperations,
  cleanupOldOperations,
} from './helpers';
