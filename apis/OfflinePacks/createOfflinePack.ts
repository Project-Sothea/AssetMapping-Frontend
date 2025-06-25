import { offlineManager } from '@rnmapbox/maps';
import { Alert } from 'react-native';

type CreateOfflinePackProps = Parameters<typeof offlineManager.createPack>[0];

export const CreateOfflinePack = async (options: CreateOfflinePackProps) => {
  try {
    await offlineManager.createPack(options, (pack, status) => {
      console.log('pack: ', pack);
      console.log('status: ', status);
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
