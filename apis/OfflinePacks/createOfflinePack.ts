import { offlineManager } from '@rnmapbox/maps';
import { Alert } from 'react-native';
import { CreateOfflinePackProps } from '~/utils/globalTypes';

export const CreateOfflinePack = async (
  options: CreateOfflinePackProps,
  setProgress: (progress: number) => void,
  setName: (name: string) => void
) => {
  console.log(options);
  try {
    await offlineManager.createPack(options, (pack, status) => {
      console.log('pack: ', pack);
      console.log('status: ', status);
      setProgress(status.percentage);
      setName(status.name);
    });
  } catch (err) {
    console.error('Offline pack error:', err);
    Alert.alert('CreatePack Error', 'Pack already Created');
  }
};

/*
Errors:
1.  ERROR  [Error: Offline pack with name Sre O Primary School already exists.]
*/
