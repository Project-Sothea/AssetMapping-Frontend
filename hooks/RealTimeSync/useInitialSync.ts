import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { initializeLocalData } from '~/services/sync/syncService';
import { getTransferState } from '~/services/sync/transferCoordinator';
import { usePopup } from '~/shared/contexts/PopupContext';

/** Run the local setup check, not a routine bidirectional sync. */
export function useInitialSync() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { showPopup } = usePopup();
  const retry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await initializeLocalData();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Initial setup failed';
      setError(message);
      if (getTransferState().setupReady)
        showPopup('Initial download failed. Please retry the download manually.', '#c0392b');
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['pins'] });
      await queryClient.invalidateQueries({ queryKey: ['forms'] });
      setIsLoading(false);
    }
  }, [queryClient, showPopup]);
  useEffect(() => {
    void retry();
  }, [retry]);
  return { error, isLoading, retry };
}
