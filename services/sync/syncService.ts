import { resetLocalDataOnce } from './localDataReset';
import { downloadSnapshotIntoEmptyDatabase } from './localDataTransfer';
import { finishSetup, getTransferState, runTransfer } from './transferCoordinator';

let initialization: Promise<void> | undefined;

/** Preserve existing local work; download only during first empty-device setup. */
export function initializeLocalData(): Promise<void> {
  if (getTransferState().setupReady) return Promise.resolve();
  if (initialization) return initialization;
  initialization = runTransfer('setup', async () => {
    const needsDownload = await resetLocalDataOnce();
    // A failed initial download must not prevent offline data collection.
    try {
      if (needsDownload) await downloadSnapshotIntoEmptyDatabase();
    } finally {
      finishSetup();
    }
  }).finally(() => {
    initialization = undefined;
  });
  return initialization;
}
