import { Pin, RePin } from '~/utils/globalTypes';
import SyncManager from './SyncManager';
import { PinSyncStrategy } from './implementations/pins/PinSyncStrategy';
import { DrizzlePinRepo } from './implementations/pins/DrizzlePinRepo';
import { SupabasePinRepo } from './implementations/pins/SupabasePinRepo';
import { ImageSyncService } from './ImageSyncService';

const localPinRepo = new DrizzlePinRepo(); // only create this once
const remotePinRepo = new SupabasePinRepo();

export const pinSyncManager = SyncManager.getInstance<Pin, RePin>(
  'pin',
  new PinSyncStrategy(),
  localPinRepo,
  remotePinRepo,
  new ImageSyncService(localPinRepo)
);
