/**
 * Initial Sync Hook
 *
 * Performs a full sync of all data from the server on app startup
 * Ensures the local database is up-to-date with the latest server state
 */

import { useEffect, useState } from 'react';
import { pullAllPins, pullAllForms } from '~/services/sync/pullUpdates';
import { processQueue } from '~/services/sync/queue';
import { usePopup } from '~/shared/contexts/PopupContext';

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
  const { showPopup } = usePopup();

  useEffect(() => {
    const performInitialSync = async () => {
      try {
        setState({ isLoading: true, error: null, completed: false });
        console.log('🚀 Starting initial data sync...');

        // Show non-blocking notification
        showPopup('Syncing data...', '#3498db');

        // Add a small delay to ensure database is ready
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Process any pending local operations (outbox) - do this first
        console.log('📤 Processing pending operations...');
        await processQueue();

        // Small delay between operations to prevent database locks
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Pull all pins from server
        console.log('📍 Pulling pins from server...');
        await pullAllPins();

        // Small delay between operations
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Pull all forms from server
        console.log('📋 Pulling forms from server...');
        await pullAllForms();

        console.log('✅ Initial data sync completed successfully');
        setState({ isLoading: false, error: null, completed: true });

        // Show success notification
        showPopup('Data synced!', '#27ae60');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error during initial sync';
        console.error('❌ Initial data sync failed:', error);
        setState({ isLoading: false, error: errorMessage, completed: false });

        // Show error notification but don't block the app
        showPopup('Sync failed - check connection', '#e74c3c');
      }
    };

    performInitialSync();
  }, [showPopup]);

  return state;
}
