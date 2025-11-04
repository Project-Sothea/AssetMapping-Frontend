/**
 * Sync Service
 *
 * Central service for managing data synchronization between local and remote databases.
 * Provides a single responsibility point for sync operations.
 */

import { pullAllPins, pullAllForms } from './pullUpdates';
import { processQueue } from './queue';

/**
 * Performs a full bidirectional sync:
 * 1. Push pending local changes to server
 * 2. Pull all data from server to local database
 *
 * @throws Error if sync fails
 */
export async function performFullSync(): Promise<void> {
  console.log('🚀 Starting full data sync...');

  // Add a small delay to ensure database is ready
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Process any pending local operations (outbox) - do this first
  console.log('📤 Processing pending operations...');
  await processQueue();

  // Small delay between operations to prevent database locks
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Pull all pins from server
  console.log('📍 Pulling pins from server...');
  await pullAllPins();

  // Small delay between operations
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Pull all forms from server
  console.log('📋 Pulling forms from server...');
  await pullAllForms();

  console.log('✅ Full data sync completed successfully');
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
  apiUrl: string,
  deviceId: string,
  webSocketManager: { connect: (deviceId: string) => Promise<void> }
): Promise<void> {
  console.log('🔄 Reconnecting WebSocket with new API URL...');
  await webSocketManager.connect(deviceId);

  console.log('📥 Pulling data from new backend...');
  await performFullSync();

  console.log('✅ Successfully connected and synced with new backend');
}
