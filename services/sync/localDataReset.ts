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
export async function resetLocalDataOnce(): Promise<boolean> {
  const completedVersion = await AsyncStorage.getItem(LOCAL_DATA_RESET_KEY);
  if (completedVersion === LOCAL_DATA_RESET_VERSION) {
    return false;
  }
  if (completedVersion !== null) {
    throw new Error(
      'Unknown local reset version. Local data was preserved; contact the team before continuing.'
    );
  }

  console.warn('Running one-time local data reset before sync');

  // Forms reference pins, so clear them first. The queue must be cleared before
  // sync starts or old local writes could be pushed back to the server.
  await clearLastSyncTimestamp();
  db.transaction((tx) => {
    tx.delete(forms).run();
    tx.delete(pins).run();
    tx.delete(syncQueue).run();
  });

  await AsyncStorage.setItem(LOCAL_DATA_RESET_KEY, LOCAL_DATA_RESET_VERSION);
  return true;
}
