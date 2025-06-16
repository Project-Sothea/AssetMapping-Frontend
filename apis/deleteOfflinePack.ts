import { offlineManager } from '@rnmapbox/maps';

export const deleteOfflinePack = async (name: string) => {
  try {
    await offlineManager.deletePack(name);
  } catch (err) {
    console.error('Failed to delete pack:', err);
    throw err instanceof Error ? err : new Error('Unknown error');
  }
};
