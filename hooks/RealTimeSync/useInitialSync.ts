/**
 * Initial Sync Hook
 *
 * Performs a full sync of all data from the server on app startup
 * Ensures the local database is up-to-date with the latest server state
 */

import { useEffect, useState } from 'react';
import { pullAllPins, pullAllForms } from '~/services/sync/pullUpdates';
import { processQueue } from '~/services/sync/queue';

interface InitialSyncState {
  isLoading: boolean;
  error: string | null;
  completed: boolean;
}

/**
 * Hook to perform initial data synchronization on app startup
 * Pulls all pins and forms from the server and syncs to local database
 */
export function useInitialSync(): InitialSyncState {
  const [state, setState] = useState<InitialSyncState>({
    isLoading: false,
    error: null,
    completed: false,
  });

  useEffect(() => {
    const performInitialSync = async () => {
      try {
        setState({ isLoading: true, error: null, completed: false });
        console.log('🚀 Starting initial data sync...');

        //Problem: If the user has offline changes, then would there be race conditions if he pulls the initial sync immediately? or will the websocket just send his changes a second time
        // Process any pending local operations (outbox)
        await processQueue();

        // Pull all pins from server
        await pullAllPins();

        // Pull all forms from server
        await pullAllForms();

        console.log('✅ Initial data sync completed successfully');
        setState({ isLoading: false, error: null, completed: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during initial sync';
        console.error('❌ Initial data sync failed:', error);
        setState({ isLoading: false, error: errorMessage, completed: false });
      }
    };

    performInitialSync();
  }, []);

  return state;
}
