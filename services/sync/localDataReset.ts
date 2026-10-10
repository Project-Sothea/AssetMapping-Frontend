import AsyncStorage from '@react-native-async-storage/async-storage';

import { forms, pins, syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

import { clearLastSyncTimestamp } from './syncMetadata';

// Bump this value only when another deliberate local-data reset is required.
const LOCAL_DATA_RESET_KEY = 'localDataResetVersion';
const LOCAL_DATA_RESET_VERSION = '1';

/**
 * Removes stale offline data once, before the first sync of the reset build.
 * API configuration and other app settings are intentionally left untouched.
 */
export async function resetLocalDataOnce(): Promise<void> {
  const completedVersion = await AsyncStorage.getItem(LOCAL_DATA_RESET_KEY);
  if (completedVersion === LOCAL_DATA_RESET_VERSION) {
    return;
  }

  console.warn('Running one-time local data reset before sync');

  // Forms reference pins, so clear them first. The queue must be cleared before
  // sync starts or old local writes could be pushed back to the server.
  await db.delete(forms);
  await db.delete(pins);
  await db.delete(syncQueue);
  await clearLastSyncTimestamp();

  await AsyncStorage.setItem(LOCAL_DATA_RESET_KEY, LOCAL_DATA_RESET_VERSION);
}
