import AsyncStorage from '@react-native-async-storage/async-storage';
import { count } from 'drizzle-orm';

import { forms, pins, syncInflight, syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

const LOCAL_DATA_RESET_KEY = 'localDataResetVersion';
const LOCAL_DATA_RESET_VERSION = '1';

// The historical marker records setup, not schema compatibility. DatabaseGate
// checks schema safety before this runs; existing rows and outbox entries stay intact.
export async function resetLocalDataOnce(): Promise<boolean> {
  const marker = await AsyncStorage.getItem(LOCAL_DATA_RESET_KEY);
  if (marker === LOCAL_DATA_RESET_VERSION) return false;
  if (marker !== null) throw new Error('Unknown local reset version. Local data was preserved.');
  // Recovery history also makes the device nonempty, even if its entity was deleted.
  const empty = [forms, pins, syncQueue, syncInflight].every(
    (table) => (db.select({ n: count() }).from(table).get()?.n ?? 0) === 0
  );
  await AsyncStorage.setItem(LOCAL_DATA_RESET_KEY, LOCAL_DATA_RESET_VERSION);
  return empty;
}
