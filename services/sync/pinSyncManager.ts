import { Pin, RePin } from '~/utils/globalTypes';
import SyncManager from './SyncManager';
import { PinSyncStrategy } from './implementations/PinSyncStrategy';
import { DrizzlePinRepo } from './implementations/DrizzlePinRepo';
import { SupabasePinRepo } from './implementations/SupabasePinRepo';
import { ImageSyncService } from './ImageSyncService';
import { ConnectivityManager } from '../ConnectivityManager';

const localPinRepo = new DrizzlePinRepo(); // only create this once
const remotePinRepo = new SupabasePinRepo();

export const pinSyncManager = SyncManager.getInstance<Pin, RePin>(
  'pin',
  new PinSyncStrategy(),
  localPinRepo,
  remotePinRepo,
  new ImageSyncService(localPinRepo)
);

ConnectivityManager.getInstance().subscribe((isConnected) => {
  console.log('[Network]', isConnected ? 'Online' : 'Offline');
  if (isConnected) {
    pinSyncManager.syncNow(); // kick off sync
  }
});
