/**
 * Initial Sync Hook
 *
 * Performs a full sync of all data from the server on app startup
 * Ensures the local database is up-to-date with the latest server state
 */

import { useEffect, useState } from 'react';

import { performFullSync } from '~/services/sync/syncService';
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
    const performInitialSyncWithNotifications = async () => {
      try {
        setState({ isLoading: true, error: null, completed: false });

        // Show non-blocking notification
        showPopup('Syncing data...', '#3498db');

        // Use the centralized sync service
        await performFullSync();

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

    // Delay sync to avoid scheduling updates during render
    const timeoutId = setTimeout(() => {
      performInitialSyncWithNotifications();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [showPopup]);

  return state;
}
