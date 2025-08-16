import { Pin, RePin } from '~/utils/globalTypes';
import SyncManager from './SyncManager';
import { DrizzlePinRepo } from './implementations/pins/DrizzlePinRepo';
import { SupabasePinRepo } from './implementations/pins/SupabasePinRepo';
import { ImageSyncService } from './image/ImageSyncService';
import { SyncStrategy } from './implementations/SyncStrategy';
import { PinSyncHandler } from './handlers/PinSyncHandler';

const localPinRepo = new DrizzlePinRepo(); // only create this once
const remotePinRepo = new SupabasePinRepo();

const pinSyncHandler = PinSyncHandler.getInstance(
  new SyncStrategy<Pin, RePin>(),
  localPinRepo,
  remotePinRepo,
  new ImageSyncService(localPinRepo)
);

export const syncManagerInstance = SyncManager.getInstance();
syncManagerInstance.addHandler(pinSyncHandler);
