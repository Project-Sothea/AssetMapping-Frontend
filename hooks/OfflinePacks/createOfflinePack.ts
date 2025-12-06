import { offlineManager } from '@rnmapbox/maps';
import { Alert } from 'react-native';

import { CreateOfflinePackProps } from '~/hooks/OfflinePacks/types';

export const CreateOfflinePack = async (
  options: CreateOfflinePackProps,
  setProgress: (progress: number) => void,
  setName: (name: string) => void
) => {
  try {
    // Create the offline pack
    await offlineManager.createPack(options, (pack, status) => {
      // update progress + name
      if (status.percentage != null) {
        setProgress(status.percentage);
      }
      setName(pack.metadata?.name ?? options.name);
    });
  } catch (err) {
    console.error('Offline pack error:', err);
    const errorMessage =
      err instanceof Error ? err.message : 'Pack already Created or invalid bounds';
    Alert.alert('CreatePack Error', errorMessage);
  }
};
