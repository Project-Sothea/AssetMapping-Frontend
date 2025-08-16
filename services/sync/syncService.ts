import { Form, Pin, ReForm, RePin } from '~/utils/globalTypes';
import SyncManager from './SyncManager';
import { DrizzlePinRepo } from './implementations/pins/DrizzlePinRepo';
import { SupabasePinRepo } from './implementations/pins/SupabasePinRepo';
import { SyncStrategy } from './implementations/SyncStrategy';
import { PinSyncHandler } from './handlers/PinSyncHandler';
import { FormSyncHandler } from './handlers/FormSyncHandler';
import { DrizzleFormRepo } from './implementations/forms/DrizzleFormRepo';
import { SupabaseFormRepo } from './implementations/forms/SupabaseFormRepo';

export const localPinRepo = new DrizzlePinRepo(); // only create this once
const remotePinRepo = new SupabasePinRepo();
export const localFormRepo = new DrizzleFormRepo(); // only create this once
const remoteFormRepo = new SupabaseFormRepo();

const pinSyncHandler = PinSyncHandler.getInstance(
  new SyncStrategy<Pin, RePin>(),
  localPinRepo,
  remotePinRepo
);

const formSyncHandler = FormSyncHandler.getInstance(
  new SyncStrategy<Form, ReForm>(),
  localFormRepo,
  remoteFormRepo
);

export const syncManagerInstance = SyncManager.getInstance();
syncManagerInstance.addHandler(pinSyncHandler);
syncManagerInstance.addHandler(formSyncHandler);
