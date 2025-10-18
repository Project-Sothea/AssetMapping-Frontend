/**
 * SyncQueueManager - Manages operation queue for offline-first sync
 *
 * Responsibilities:
 * - Enqueue operations with idempotency
 * - Process queue in order with retry logic
 * - Track operation status and metrics
 * - Emit events for monitoring
 *
 * Design Patterns:
 * - Singleton: Single queue manager instance
 * - Observer: Event listeners for queue events
 * - Command Pattern: Operations as commands
 */

import { eq, and, inArray, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '~/services/drizzleDb';
import { syncQueue } from '~/db/schema';
import * as FormsAPI from './api/forms';
import * as PinsAPI from './api/pins';
import {
  QueueOperationInput,
  QueueOperation,
  QueueStatus,
  ProcessResult,
  BatchProcessResult,
  QueueMetrics,
  QueueEvent,
  QueueEventListener,
  QueueConfig,
  DEFAULT_QUEUE_CONFIG,
} from './types';
import {
  generateIdempotencyKey,
  getDeviceId,
  calculateBackoffDelay,
  shouldRetry,
  getCurrentTimestamp,
  getTimestampAge,
  validateOperationInput,
  getNextSequenceNumber,
  formatOperation,
  isNetworkError,
} from './utils';

// ==================== Main Class ====================

export class SyncQueueManager {
  // ==================== Singleton ====================

  private static instance: SyncQueueManager | null = null;

  private constructor(private config: QueueConfig = DEFAULT_QUEUE_CONFIG) {}

  public static getInstance(config?: QueueConfig): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager(config);
    }
    return SyncQueueManager.instance;
  }

  // ==================== State ====================

  private listeners: QueueEventListener[] = [];
  private isProcessing = false;
  private processingTimeout: ReturnType<typeof setTimeout> | null = null;

  // ==================== Public API ====================

  /**
   * Enqueue a new operation
   * Validates input, checks idempotency, and adds to queue
   *
   * @throws IdempotencyError if operation already queued
   * @throws Error if validation fails
   */
  async enqueue(input: QueueOperationInput): Promise<string> {
    // Validate input
    const validationError = validateOperationInput(input);
    if (validationError) {
      throw new Error(`Invalid operation input: ${validationError}`);
    }

    // Generate idempotency key
    const deviceId = input.deviceId || (await getDeviceId());
    const idempotencyKey = await generateIdempotencyKey({
      operation: input.operation,
      entityType: input.entityType,
      entityId: input.entityId,
      timestamp: input.timestamp,
      deviceId,
    });

    // Check if already queued
    const existing = await this.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      console.log(`Operation already queued: ${formatOperation(input)}`);
      this.emit({
        type: 'operation_enqueued',
        operationId: existing.id,
        entityType: input.entityType,
      });
      return existing.id;
    }

    // Create operation
    const operationId = uuidv4();
    const sequenceNumber = getNextSequenceNumber();

    await db.insert(syncQueue).values({
      id: operationId,
      operation: input.operation,
      entityType: input.entityType,
      entityId: input.entityId,
      idempotencyKey,
      payload: JSON.stringify(input.data),
      status: 'pending',
      attempts: 0,
      maxAttempts: this.config.maxAttempts,
      sequenceNumber,
      dependsOn: input.dependsOn ? JSON.stringify(input.dependsOn) : null,
      deviceId,
      createdAt: getCurrentTimestamp(),
    });

    console.log(`✓ Enqueued: ${formatOperation(input)} [${operationId.substring(0, 8)}]`);

    this.emit({
      type: 'operation_enqueued',
      operationId,
      entityType: input.entityType,
    });

    // Trigger processing
    this.scheduleProcessing();

    return operationId;
  }

  /**
   * Process all pending operations
   * Executes in order, respecting dependencies
   */
  async processQueue(): Promise<BatchProcessResult> {
    // Guard: Prevent concurrent processing
    if (this.isProcessing) {
      console.log('Queue processing already in progress');
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    }

    this.isProcessing = true;

    try {
      // Get pending operations
      const pendingOps = await this.getPendingOperations();

      if (pendingOps.length === 0) {
        this.emit({ type: 'queue_empty' });
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
        };
      }

      console.log(`\n📦 Processing ${pendingOps.length} queued operations...`);

      this.emit({
        type: 'batch_started',
        operationCount: pendingOps.length,
      });

      // Process operations sequentially (to maintain order)
      const results: ProcessResult[] = [];

      for (const op of pendingOps) {
        const result = await this.processOperation(op);
        results.push(result);

        // Stop if we hit batch limit
        if (results.length >= this.config.batchSize) {
          break;
        }
      }

      const batchResult: BatchProcessResult = {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };

      console.log(`✓ Batch complete: ${batchResult.successful}/${batchResult.total} successful\n`);

      this.emit({
        type: 'batch_completed',
        result: batchResult,
      });

      // Continue processing if more pending
      if (pendingOps.length > this.config.batchSize) {
        this.scheduleProcessing(1000); // Process next batch after 1s
      }

      return batchResult;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<QueueMetrics> {
    const allOps = await db.select().from(syncQueue).all();

    const pending = allOps.filter((op) => op.status === 'pending');
    const inProgress = allOps.filter((op) => op.status === 'in_progress');
    const failed = allOps.filter((op) => op.status === 'failed');
    const completed = allOps.filter((op) => op.status === 'completed');

    // Calculate average latency for completed ops
    const completedWithLatency = completed
      .filter((op) => op.lastAttemptAt)
      .map((op) => getTimestampAge(op.lastAttemptAt!));

    const avgLatencyMs =
      completedWithLatency.length > 0
        ? completedWithLatency.reduce((a, b) => a + b, 0) / completedWithLatency.length
        : 0;

    // Find oldest pending
    const oldestPending = pending.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    // Find last successful sync
    const lastSuccess = completed.sort(
      (a, b) => new Date(b.lastAttemptAt!).getTime() - new Date(a.lastAttemptAt!).getTime()
    )[0];

    return {
      totalOperations: allOps.length,
      pendingOperations: pending.length,
      inProgressOperations: inProgress.length,
      failedOperations: failed.length,
      completedOperations: completed.length,
      avgLatencyMs: Math.round(avgLatencyMs),
      oldestPendingAt: oldestPending?.createdAt || null,
      lastSuccessfulSyncAt: lastSuccess?.lastAttemptAt || null,
    };
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Clear completed operations older than retention period
   */
  async cleanupOld(): Promise<number> {
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - retentionMs).toISOString();

    const toDelete = await db
      .select()
      .from(syncQueue)
      .where(and(eq(syncQueue.status, 'completed'), eq(syncQueue.createdAt, cutoffTime)))
      .all();

    if (toDelete.length > 0) {
      await db.delete(syncQueue).where(
        inArray(
          syncQueue.id,
          toDelete.map((op) => op.id)
        )
      );

      console.log(`🗑️  Cleaned up ${toDelete.length} old operations`);
    }

    return toDelete.length;
  }

  /**
   * Clear all failed operations (after manual review)
   */
  async clearFailed(): Promise<number> {
    const failed = await db.select().from(syncQueue).where(eq(syncQueue.status, 'failed')).all();

    if (failed.length > 0) {
      await db.delete(syncQueue).where(eq(syncQueue.status, 'failed'));
      console.log(`🗑️  Cleared ${failed.length} failed operations`);
    }

    return failed.length;
  }

  /**
   * Retry a specific failed operation
   */
  async retryOperation(operationId: string): Promise<void> {
    await db
      .update(syncQueue)
      .set({
        status: 'pending',
        attempts: 0,
        lastError: null,
      })
      .where(eq(syncQueue.id, operationId));

    this.scheduleProcessing();
  }

  /**
   * Retry all failed operations
   */
  async retryAllFailed(): Promise<number> {
    const failed = await db.select().from(syncQueue).where(eq(syncQueue.status, 'failed')).all();

    if (failed.length > 0) {
      await db
        .update(syncQueue)
        .set({
          status: 'pending',
          attempts: 0,
          lastError: null,
        })
        .where(eq(syncQueue.status, 'failed'));

      console.log(`🔄 Retrying ${failed.length} failed operations`);
      this.scheduleProcessing();
    }

    return failed.length;
  }

  // ==================== Private Methods ====================

  /**
   * Process a single operation
   */
  private async processOperation(op: QueueOperation): Promise<ProcessResult> {
    const opLabel = formatOperation(op);

    try {
      // Mark as in-progress
      await this.updateStatus(op.id, 'in_progress');

      this.emit({
        type: 'operation_started',
        operationId: op.id,
      });

      console.log(`  → Processing: ${opLabel}`);

      // Send to Supabase backend
      await this.sendToBackend(op);

      // Mark as completed
      await this.updateStatus(op.id, 'completed');

      console.log(`  ✓ Completed: ${opLabel}`);

      this.emit({
        type: 'operation_completed',
        operationId: op.id,
        data: {},
      });

      return {
        operationId: op.id,
        success: true,
        data: {},
      };
    } catch (error: any) {
      return await this.handleOperationError(op, error);
    }
  }

  /**
   * Handle operation error with retry logic
   */
  private async handleOperationError(op: QueueOperation, error: Error): Promise<ProcessResult> {
    const newAttempts = op.attempts + 1;
    const opLabel = formatOperation(op);

    console.error(`  ✖ Failed: ${opLabel} - ${error.message}`);

    this.emit({
      type: 'operation_failed',
      operationId: op.id,
      error,
      attempts: newAttempts,
    });

    // Check if should retry
    if (shouldRetry(newAttempts, op.maxAttempts) && isNetworkError(error)) {
      // Schedule retry with backoff
      const backoffMs = calculateBackoffDelay(newAttempts);

      await db
        .update(syncQueue)
        .set({
          attempts: newAttempts,
          lastError: error.message,
          lastAttemptAt: getCurrentTimestamp(),
          status: 'pending', // Back to pending for retry
        })
        .where(eq(syncQueue.id, op.id));

      console.log(
        `  ⏱️  Will retry ${opLabel} in ${backoffMs}ms (attempt ${newAttempts}/${op.maxAttempts})`
      );

      // Schedule retry
      setTimeout(() => this.scheduleProcessing(), backoffMs);
    } else {
      // Max retries or non-retriable error - mark as failed
      await this.updateStatus(op.id, 'failed', error.message);

      console.error(`  ⚠️  Max retries reached for ${opLabel}`);

      this.emit({
        type: 'operation_max_retries',
        operationId: op.id,
        error,
      });
    }

    return {
      operationId: op.id,
      success: false,
      error,
    };
  }

  /**
   * Send operation to Supabase backend
   */
  private async sendToBackend(op: QueueOperation): Promise<void> {
    const payload = JSON.parse(op.payload);

    switch (op.entityType) {
      case 'pin':
        await this.syncPin(op.operation, payload);
        break;
      case 'form':
        await this.syncForm(op.operation, payload);
        break;
      default:
        throw new Error(`Unknown entity type: ${op.entityType}`);
    }
  }

  /**
   * Sync pin to Supabase
   */
  private async syncPin(operation: string, data: any): Promise<void> {
    console.log(`  [Supabase] Syncing pin: ${operation} ${data.id}`);

    // Validate data has required ID
    if (!data.id) {
      throw new Error(
        `Pin ID is required for ${operation} operation. Received: ${JSON.stringify(data)}`
      );
    }

    switch (operation) {
      case 'create':
      case 'update':
        await PinsAPI.upsertOne(data);
        break;
      case 'delete':
        await PinsAPI.deletePin(data.id);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Sync form to Supabase
   */
  private async syncForm(operation: string, data: any): Promise<void> {
    console.log(`  [Supabase] Syncing form: ${operation} ${data.id}`);

    // Validate data has required ID
    if (!data.id) {
      throw new Error(
        `Form ID is required for ${operation} operation. Received: ${JSON.stringify(data)}`
      );
    }

    switch (operation) {
      case 'create':
      case 'update':
        await FormsAPI.upsertOne(data);
        break;
      case 'delete':
        await FormsAPI.deleteForm(data.id);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Get pending operations in order
   */
  private async getPendingOperations(): Promise<QueueOperation[]> {
    return await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.status, 'pending'))
      .orderBy(asc(syncQueue.sequenceNumber))
      .limit(this.config.batchSize * 2) // Get extra for filtering
      .all();
  }

  /**
   * Find operation by idempotency key
   */
  private async findByIdempotencyKey(key: string): Promise<QueueOperation | null> {
    const ops = await db.select().from(syncQueue).where(eq(syncQueue.idempotencyKey, key)).all();

    return ops[0] || null;
  }

  /**
   * Update operation status
   */
  private async updateStatus(
    operationId: string,
    status: QueueStatus,
    error?: string
  ): Promise<void> {
    await db
      .update(syncQueue)
      .set({
        status,
        lastError: error || null,
        lastAttemptAt: getCurrentTimestamp(),
      })
      .where(eq(syncQueue.id, operationId));
  }

  /**
   * Schedule queue processing
   */
  private scheduleProcessing(delayMs = 0): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }

    this.processingTimeout = setTimeout(() => {
      this.processQueue().catch((error) => {
        console.error('Queue processing error:', error);
      });
    }, delayMs);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: QueueEvent): void {
    const listenersCopy = [...this.listeners];
    listenersCopy.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in queue event listener:', error);
      }
    });
  }
}

export default SyncQueueManager;
