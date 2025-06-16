import { offlineManager } from '@rnmapbox/maps';

export const getOfflinePacks = async () => {
  try {
    return await offlineManager.getPacks();
  } catch (err) {
    console.error('Failed to get pack:', err);
    throw err instanceof Error ? err : new Error('Unknown error');
  }
};
