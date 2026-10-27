// Isolated QA helpers for snapshot/concurrency tests. Never imported by the app.
import { isLegacySync } from '~/services/sync/protocol';
import { uploadPendingChanges } from '~/services/sync/queue/syncQueue';

import { pullLegacyCollections, pullSnapshot } from './pull-updates';
import { createSingleFlight } from './singleFlight';

const flight = createSingleFlight();
let requested = false;

function requestSync(): Promise<void> {
  requested = true;
  return flight.run(async () => {
    do {
      requested = false;
      await uploadPendingChanges();
      if (isLegacySync) await pullLegacyCollections();
      else await pullSnapshot();
    } while (requested);
  });
}

export const performFullSync = requestSync;
export const performIncrementalSync = requestSync;
