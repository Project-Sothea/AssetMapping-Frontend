import { resetLocalDataOnce } from './localDataReset';
import { downloadSnapshotIntoEmptyDatabase } from './localDataTransfer';
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
