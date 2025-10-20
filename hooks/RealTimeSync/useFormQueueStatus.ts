/**
 * useFormQueueStatus Hook
 *
 * Live query hook that checks the sync queue for pending or failed operations
 * for a specific form. Used to determine if a form should show as synced or unsynced.
 *
 * Returns true if the form has no pending/failed operations (synced),
 * false if there are pending/failed operations (unsynced).
 */

import { useOpQueueStatus } from './useOpQueueStatus';

export const useFormQueueStatus = (formId: string) => {
  return useOpQueueStatus(formId, 'form');
};
