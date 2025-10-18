/**
 * UI Integration Helpers for Sync Queue
 *
 * Provides simplified API for UI components to enqueue
 * operations without understanding queue internals.
 */

import { SyncQueueManager } from './SyncQueueManager';
import { QueueOperationInput, OperationType, EntityType } from './types';
import { getCurrentTimestamp } from './utils';
import { v4 as uuidv4 } from 'uuid';

// ==================== Helper Functions ====================

/**
 * Get or create queue manager singleton
 */
function getQueueManager(): SyncQueueManager {
  return SyncQueueManager.getInstance();
}

/**
 * Enqueue a pin creation operation
 *
 * @param pinData - Complete pin data to create
 * @returns Operation ID
 */
export async function enqueuePinCreate(pinData: Record<string, any>): Promise<string> {
  // Ensure pin has an ID
  const pinId = pinData.id || uuidv4();
  const pinWithId = { ...pinData, id: pinId };

  const input: QueueOperationInput = {
    operation: 'create' as OperationType,
    entityType: 'pin' as EntityType,
    entityId: pinId,
    data: pinWithId, // Include ID in data
    timestamp: getCurrentTimestamp(),
  };

  return await getQueueManager().enqueue(input);
}

/**
 * Enqueue a pin update operation
 *
 * @param pinId - ID of pin to update
 * @param changes - Partial pin data to update
 * @returns Operation ID
 */
export async function enqueuePinUpdate(
  pinId: string,
  changes: Record<string, any>
): Promise<string> {
  // Ensure changes include the ID
  const changesWithId = { ...changes, id: pinId };

  const input: QueueOperationInput = {
    operation: 'update' as OperationType,
    entityType: 'pin' as EntityType,
    entityId: pinId,
    data: changesWithId, // Include ID in data
    timestamp: getCurrentTimestamp(),
  };

  return await getQueueManager().enqueue(input);
}

/**
 * Enqueue a pin deletion operation
 *
 * @param pinId - ID of pin to delete
 * @returns Operation ID
 */
export async function enqueuePinDelete(pinId: string): Promise<string> {
  const input: QueueOperationInput = {
    operation: 'delete' as OperationType,
    entityType: 'pin' as EntityType,
    entityId: pinId,
    data: { id: pinId }, // Include ID in data for delete operations
    timestamp: getCurrentTimestamp(),
  };

  return await getQueueManager().enqueue(input);
}

/**
 * Enqueue a form submission operation
 *
 * @param formData - Complete form data to submit
 * @returns Operation ID
 */
export async function enqueueFormSubmit(formData: Record<string, any>): Promise<string> {
  // Ensure form has an ID
  const formId = formData.id || uuidv4();
  const formWithId = { ...formData, id: formId };

  const input: QueueOperationInput = {
    operation: 'create' as OperationType,
    entityType: 'form' as EntityType,
    entityId: formId,
    data: formWithId, // Include ID in data
    timestamp: getCurrentTimestamp(),
  };

  return await getQueueManager().enqueue(input);
}

/**
 * Enqueue a form update operation
 *
 * @param formId - ID of form to update
 * @param changes - Partial form data to update
 * @returns Operation ID
 */
export async function enqueueFormUpdate(
  formId: string,
  changes: Record<string, any>
): Promise<string> {
  // Ensure changes include the ID
  const changesWithId = { ...changes, id: formId };

  const input: QueueOperationInput = {
    operation: 'update' as OperationType,
    entityType: 'form' as EntityType,
    entityId: formId,
    data: changesWithId, // Include ID in data
    timestamp: getCurrentTimestamp(),
  };

  return await getQueueManager().enqueue(input);
}

/**
 * Enqueue a form deletion operation
 *
 * @param formId - ID of form to delete
 * @returns Operation ID
 */
export async function enqueueFormDelete(formId: string): Promise<string> {
  const input: QueueOperationInput = {
    operation: 'delete' as OperationType,
    entityType: 'form' as EntityType,
    entityId: formId,
    data: { id: formId }, // Include ID in data for delete operations
    timestamp: getCurrentTimestamp(),
  };

  return await getQueueManager().enqueue(input);
}

// ==================== Queue Management ====================

/**
 * Manually trigger queue processing
 * Useful after app comes online or user manually syncs
 */
export async function processQueueNow(): Promise<void> {
  await getQueueManager().processQueue();
}

/**
 * Get queue health metrics
 */
export async function getQueueHealth() {
  return await getQueueManager().getMetrics();
}

/**
 * Subscribe to queue events for UI updates
 *
 * Example:
 * ```ts
 * const unsubscribe = subscribeToQueueEvents((event) => {
 *   if (event.type === 'operation_completed') {
 *     console.log('Operation completed!');
 *   }
 * });
 *
 * // Later: unsubscribe()
 * ```
 */
export function subscribeToQueueEvents(listener: (event: any) => void): () => void {
  return getQueueManager().subscribe(listener);
}

/**
 * Retry all failed operations
 */
export async function retryFailedOperations(): Promise<number> {
  return await getQueueManager().retryAllFailed();
}

/**
 * Clear all failed operations (after manual review)
 */
export async function clearFailedOperations(): Promise<number> {
  return await getQueueManager().clearFailed();
}

/**
 * Clean up old completed operations
 */
export async function cleanupOldOperations(): Promise<number> {
  return await getQueueManager().cleanupOld();
}
