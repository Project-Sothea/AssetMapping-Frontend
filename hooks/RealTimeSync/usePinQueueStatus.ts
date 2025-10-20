/**
 * usePinQueueStatus Hook
 *
 * Live query hook that checks the sync queue for pending or failed operations
 * for a specific pin. Used to determine if a pin should show as synced or unsynced.
 *
 * Returns true if the pin has no pending/failed operations (synced),
 * false if there are pending/failed operations (unsynced).
 */

import { useOpQueueStatus } from './useOpQueueStatus';

export const usePinQueueStatus = (pinId: string) => {
  return useOpQueueStatus(pinId, 'pin');
};
