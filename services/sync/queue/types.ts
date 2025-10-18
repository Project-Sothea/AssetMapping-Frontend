/**
 * Type definitions for Sync Queue System
 *
 * Provides type safety for operation queueing, status tracking,
 * and idempotency management in offline-first sync.
 */

import { SyncQueueItem } from '~/db/schema';

// ==================== Operation Types ====================

/**
 * Types of operations that can be queued
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * Entity types that support sync
 */
export type EntityType = 'pin' | 'form';

/**
 * Status of a queued operation
 */
export type QueueStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

// ==================== Queue Operation ====================

/**
 * Input for creating a new queue operation
 */
export interface QueueOperationInput {
  /** Type of operation */
  operation: OperationType;

  /** Entity type being operated on */
  entityType: EntityType;

  /** ID of the entity */
  entityId: string;

  /** Full entity data */
  data: Record<string, any>;

  /** Timestamp of operation */
  timestamp: string;

  /** Optional: IDs of operations this depends on */
  dependsOn?: string[];

  /** Optional: Device ID for tracking */
  deviceId?: string;
}

/**
 * Full queue operation (stored in database)
 * Alias for SyncQueueItem for clarity
 */
export type QueueOperation = SyncQueueItem;

// ==================== Idempotency ====================

/**
 * Components used to generate idempotency key
 */
export interface IdempotencyKeyComponents {
  operation: OperationType;
  entityType: EntityType;
  entityId: string;
  timestamp: string;
  deviceId: string;
}

// ==================== Queue Processing ====================

/**
 * Result of processing a single operation
 */
export interface ProcessResult {
  /** ID of the operation */
  operationId: string;

  /** Whether processing succeeded */
  success: boolean;

  /** Error if processing failed */
  error?: Error;

  /** Server response data if successful */
  data?: any;
}

/**
 * Batch processing result
 */
export interface BatchProcessResult {
  /** Total operations processed */
  total: number;

  /** Number of successful operations */
  successful: number;

  /** Number of failed operations */
  failed: number;

  /** Individual operation results */
  results: ProcessResult[];
}

// ==================== Queue Configuration ====================

/**
 * Configuration for queue processing
 */
export interface QueueConfig {
  /** Maximum retry attempts per operation */
  maxAttempts: number;

  /** Base delay for exponential backoff (ms) */
  baseBackoffMs: number;

  /** Maximum number of operations to process in one batch */
  batchSize: number;

  /** Keep completed operations for this many days */
  retentionDays: number;
}

// ==================== Queue Metrics ====================

/**
 * Metrics about queue health
 */
export interface QueueMetrics {
  /** Total operations in queue */
  totalOperations: number;

  /** Pending operations */
  pendingOperations: number;

  /** In-progress operations */
  inProgressOperations: number;

  /** Failed operations needing attention */
  failedOperations: number;

  /** Completed operations (recent) */
  completedOperations: number;

  /** Average processing latency (ms) */
  avgLatencyMs: number;

  /** Oldest pending operation timestamp */
  oldestPendingAt: string | null;

  /** Last successful sync timestamp */
  lastSuccessfulSyncAt: string | null;
}

// ==================== Event Types ====================

/**
 * Events emitted by queue system
 */
export type QueueEvent =
  | { type: 'operation_enqueued'; operationId: string; entityType: EntityType }
  | { type: 'operation_started'; operationId: string }
  | { type: 'operation_completed'; operationId: string; data: any }
  | { type: 'operation_failed'; operationId: string; error: Error; attempts: number }
  | { type: 'operation_max_retries'; operationId: string; error: Error }
  | { type: 'batch_started'; operationCount: number }
  | { type: 'batch_completed'; result: BatchProcessResult }
  | { type: 'queue_empty' };

/**
 * Listener for queue events
 */
export type QueueEventListener = (event: QueueEvent) => void;

// ==================== Error Types ====================

/**
 * Custom error for queue operations
 */
export class QueueError extends Error {
  constructor(
    message: string,
    public readonly operationId: string,
    public readonly entityType: EntityType,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'QueueError';
  }
}

/**
 * Error indicating idempotency key conflict
 */
export class IdempotencyError extends QueueError {
  constructor(operationId: string, entityType: EntityType, idempotencyKey: string) {
    super(
      `Operation with idempotency key already exists: ${idempotencyKey}`,
      operationId,
      entityType
    );
    this.name = 'IdempotencyError';
  }
}

/**
 * Error indicating maximum retries exceeded
 */
export class MaxRetriesError extends QueueError {
  constructor(operationId: string, entityType: EntityType, attempts: number, cause: Error) {
    super(
      `Maximum retry attempts (${attempts}) exceeded for operation`,
      operationId,
      entityType,
      cause
    );
    this.name = 'MaxRetriesError';
  }
}

// ==================== Default Constants ====================

/**
 * Default queue configuration
 */
export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxAttempts: 3,
  baseBackoffMs: 1000, // 1 second
  batchSize: 10,
  retentionDays: 7,
};

/**
 * Backoff delays for retry attempts (in ms)
 */
export const BACKOFF_DELAYS = [
  1000, // 1st retry: 1s
  2000, // 2nd retry: 2s
  4000, // 3rd retry: 4s
  8000, // 4th retry: 8s
  16000, // 5th retry: 16s
] as const;
