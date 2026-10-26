import AsyncStorage from '@react-native-async-storage/async-storage';
import { count, inArray, or, isNull } from 'drizzle-orm';

import { forms, pins, syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

const LOCAL_DATA_RESET_KEY = 'localDataResetVersion';
const LOCAL_DATA_RESET_VERSION = '1';

// Initialization must never discard work. Unknown legacy local writes require
// review/export; do not upload or erase them merely because a marker is absent.
export async function resetLocalDataOnce(): Promise<void> {
  if ((await AsyncStorage.getItem(LOCAL_DATA_RESET_KEY)) === LOCAL_DATA_RESET_VERSION) return;
  const pending =
    db
      .select({ n: count() })
      .from(syncQueue)
      .where(inArray(syncQueue.status, ['pending', 'failed']))
      .get()?.n ?? 0;
  const unknownForms =
    db
      .select({ n: count() })
      .from(forms)
      .where(or(inArray(forms.status, ['unsynced']), isNull(forms.status)))
      .get()?.n ?? 0;
  const unknownPins =
    db
      .select({ n: count() })
      .from(pins)
      .where(or(inArray(pins.status, ['unsynced']), isNull(pins.status)))
      .get()?.n ?? 0;
  if (pending || unknownForms || unknownPins) {
    throw new Error(
      'Saved local data needs review before sync. Keep this app installed; do not clear its storage.'
    );
  }
  await AsyncStorage.setItem(LOCAL_DATA_RESET_KEY, LOCAL_DATA_RESET_VERSION);
}
