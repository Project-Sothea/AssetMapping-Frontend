/**
 * Sync Service
 *
 * Central service for managing data synchronization between local and remote databases.
 * Provides a single responsibility point for sync operations.
 */

import { pullAllPins, pullAllForms, pullPinsSince, pullFormsSince } from './pullUpdates';
import { processQueue } from './queue/syncQueue';
import { getLastSyncTimestamp, updateLastSyncTimestamp } from './syncMetadata';

/**
 * Performs a full bidirectional sync:
 * 1. Push pending local changes to server
 * 2. Pull all data from server to local database
 *
 * @throws Error if sync fails
 */
export async function performFullSync(): Promise<void> {
  // Add a small delay to ensure database is ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Process any pending local operations (outbox) - do this first
  await processQueue();

  // Small delay between operations to prevent database locks
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Pull all pins from server
  await pullAllPins();

  // Small delay between operations
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Pull all forms from server
  await pullAllForms();

  // Update last sync timestamp
  await updateLastSyncTimestamp();
}

/**
 * Performs an incremental sync (only fetches data updated since last sync):
 * 1. Push pending local changes to server
 * 2. Pull only updated data from server since last sync
 *
 * @throws Error if sync fails
 */
export async function performIncrementalSync(): Promise<void> {
  // Add a small delay to ensure database is ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get last sync timestamp
  const lastSyncTimestamp = await getLastSyncTimestamp();

  if (lastSyncTimestamp === 0) {
    await performFullSync();
    return;
  }

  // Process any pending local operations (outbox) - do this first
  await processQueue();

  // Small delay between operations to prevent database locks
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Pull pins updated since last sync
  await pullPinsSince(lastSyncTimestamp);

  // Small delay between operations
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Pull forms updated since last sync
  await pullFormsSince(lastSyncTimestamp);

  // Update last sync timestamp
  await updateLastSyncTimestamp();
}

/**
 * Reconnects to the backend with a new API URL and performs full sync
 *
 * @param apiUrl - The new API URL to connect to
 * @param deviceId - The device identifier for WebSocket connection
 * @param webSocketManager - The WebSocket manager instance
 * @throws Error if connection or sync fails
 */
export async function reconnectAndSync(
  _apiUrl: string,
  deviceId: string,
  webSocketManager: { connect: (deviceId: string) => Promise<void> }
): Promise<void> {
  await webSocketManager.connect(deviceId);

  await performFullSync();
}
