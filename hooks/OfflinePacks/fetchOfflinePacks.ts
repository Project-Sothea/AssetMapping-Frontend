import { offlineManager } from '@rnmapbox/maps';
import { Alert } from 'react-native';

export const fetchOfflinePacks = async () => {
  try {
    return await offlineManager.getPacks();
  } catch (err) {
    console.error('Failed to get packs:', err);
    Alert.alert('FetchPacks Fail', 'Failed to get packs');
    throw err instanceof Error ? err : new Error('Failed to get packs Error');
  }
};
