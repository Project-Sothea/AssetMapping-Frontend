import { createSingleFlight } from '~/shared/utils/singleFlight';

import { resetLocalDataOnce } from './localDataReset';
import { downloadSnapshotIntoEmptyDatabase } from './localDataTransfer';
import { isLegacySync } from './protocol';
import { pullLegacyCollections, pullSnapshot } from './pullUpdates';
import { processQueue } from './queue/syncQueue';
import { finishSetup, getTransferState, runTransfer } from './transferCoordinator';

let initialization: Promise<void> | undefined;

/** Startup is local-only except the previously approved legacy reset/download. */
export function initializeLocalData(): Promise<void> {
  if (getTransferState().setupReady) return Promise.resolve();
  if (initialization) return initialization;
  initialization = runTransfer('setup', async () => {
    const reset = await resetLocalDataOnce();
    // Once the reset marker is safely persisted, a network error must not
    // cause another reset or stop the team from collecting offline responses.
    try {
      if (reset) await downloadSnapshotIntoEmptyDatabase();
    } finally {
      finishSetup();
    }
  }).finally(() => {
    initialization = undefined;
  });
  return initialization;
}

// Retained for existing connection controls; changing connection never uploads/downloads.
export async function reconnectAndSync(
  deviceId: string,
  manager: { connect(id: string): Promise<void> }
) {
  await manager.connect(deviceId);
}

// Explicit internal helpers only; app lifecycle and connection events never invoke them.
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
