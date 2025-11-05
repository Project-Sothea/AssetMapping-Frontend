/**
 * Sync Metadata Service
 *
 * Manages sync timestamps using AsyncStorage for simple persistence
 * Tracks last successful sync time to enable incremental syncing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = 'lastSync';

/**
 * Get the last sync timestamp
 * Returns 0 if no sync has occurred yet
 */
export async function getLastSyncTimestamp(): Promise<number> {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSync ? parseInt(lastSync, 10) : 0;
  } catch (error) {
    console.error('Failed to get last sync timestamp:', error);
    return 0;
  }
}

/**
 * Update the last sync timestamp to current time
 */
export async function updateLastSyncTimestamp(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error('Failed to update last sync timestamp:', error);
  }
}

/**
 * Clear the last sync timestamp (forces full sync on next sync)
 */
export async function clearLastSyncTimestamp(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    console.error('Failed to clear last sync timestamp:', error);
  }
}
