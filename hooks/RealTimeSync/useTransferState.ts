import { useSyncExternalStore } from 'react';

import { getTransferState, subscribeTransferState } from '~/services/sync/transferCoordinator';

export function useTransferState() {
  const state = useSyncExternalStore(subscribeTransferState, getTransferState, getTransferState);
  return { ...state, busy: !!state.kind || !state.setupReady };
}
