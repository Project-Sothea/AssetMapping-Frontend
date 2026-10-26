import { createSingleFlight } from '~/shared/utils/singleFlight';

import { resetLocalDataOnce } from './localDataReset';
import { isLegacySync } from './protocol';
import { pullLegacyCollections, pullSnapshot } from './pullUpdates';
import { processQueue } from './queue/syncQueue';

const syncListeners = new Set<() => void>();
const syncFlight = createSingleFlight(() => syncListeners.forEach((listener) => listener()));
let requested = false;
export const getSyncInProgress = syncFlight.isRunning;
export function subscribeToSync(listener: () => void) {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

function requestSync(): Promise<void> {
  requested = true;
  return syncFlight.run(async () => {
    do {
      requested = false;
      await resetLocalDataOnce();
      await processQueue();
      // One repeatable-read snapshot replaces two clock-based downloads. A
      // follow-up request during this run guarantees a fresh pass afterwards.
      if (isLegacySync) await pullLegacyCollections();
      else await pullSnapshot();
    } while (requested);
  });
}

export const performFullSync = requestSync;
export const performIncrementalSync = requestSync;

export async function reconnectAndSync(
  deviceId: string,
  manager: { connect: (deviceId: string) => Promise<void> }
) {
  await manager.connect(deviceId);
  await performFullSync();
}
