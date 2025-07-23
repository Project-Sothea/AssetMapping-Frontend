// components/AppSyncLayer.tsx

import { useRemoteToLocalSync } from '~/hooks/useRemoteToLocalSync';

export const AppSyncLayer = () => {
  useRemoteToLocalSync();
  return null;
};
