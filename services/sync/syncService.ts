import { Form, Pin, ReForm, RePin } from '~/utils/globalTypes';
import { SyncManager } from './SyncManager';
import { DrizzlePinRepo } from './repositories/pins/DrizzlePinRepo';
import { SupabasePinRepo } from './repositories/pins/SupabasePinRepo';
import { SyncStrategy } from './logic/syncing/SyncStrategy';
import { PinSyncHandler } from './logic/handlers/PinSyncHandler';
import { FormSyncHandler } from './logic/handlers/FormSyncHandler';
import { DrizzleFormRepo } from './repositories/forms/DrizzleFormRepo';
import { SupabaseFormRepo } from './repositories/forms/SupabaseFormRepo';
import * as ImageManager from './logic/images/ImageManager';
import { ImageManagerInterface } from './logic/images/types';

let _localPinRepo: DrizzlePinRepo | null = null;
let _remotePinRepo: SupabasePinRepo | null = null;
let _localFormRepo: DrizzleFormRepo | null = null;
let _remoteFormRepo: SupabaseFormRepo | null = null;
let _syncManager: SyncManager | null = null;

/**
 * Initialize sync environment. Returns constructed instances so callers can keep references or
 * tests can supply fakes instead of calling this.
 */
export function initializeSync(opts?: { imageManager?: ImageManagerInterface }) {
  if (_syncManager)
    return {
      syncManager: _syncManager,
      localPinRepo: _localPinRepo!,
      localFormRepo: _localFormRepo!,
    };

  _localPinRepo = new DrizzlePinRepo();
  _remotePinRepo = new SupabasePinRepo();
  _localFormRepo = new DrizzleFormRepo();
  _remoteFormRepo = new SupabaseFormRepo();

  const imageManager = (opts?.imageManager ?? (ImageManager as unknown)) as ImageManagerInterface;

  const pinSyncHandler = new PinSyncHandler(
    new SyncStrategy<Pin, RePin>(),
    _localPinRepo,
    _remotePinRepo,
    imageManager
  );

  const formSyncHandler = new FormSyncHandler(
    new SyncStrategy<Form, ReForm>(),
    _localFormRepo,
    _remoteFormRepo
  );

  _syncManager = SyncManager.getInstance();
  _syncManager.addHandler(pinSyncHandler);
  _syncManager.addHandler(formSyncHandler);

  return { syncManager: _syncManager, localPinRepo: _localPinRepo, localFormRepo: _localFormRepo };
}

/**
 * Backwards-compatible getters: will throw if initializeSync() hasn't been called. This forces
 * explicit initialization in tests and app bootstrap.
 */
export function getSyncManager() {
  if (!_syncManager) throw new Error('Sync not initialized. Call initializeSync() before use.');
  return _syncManager;
}

export function getLocalPinRepo() {
  if (!_localPinRepo) throw new Error('Sync not initialized. Call initializeSync() before use.');
  return _localPinRepo;
}

export function getLocalFormRepo() {
  if (!_localFormRepo) throw new Error('Sync not initialized. Call initializeSync() before use.');
  return _localFormRepo;
}

/** Convenience initializer that uses default ImageManager. Returns the same shape as initializeSync. */
export function initializeDefaultSync() {
  return initializeSync();
}
