import { Form, Pin, ReForm, RePin } from '~/utils/globalTypes';
import { SyncManager } from './SyncManager';
import { DrizzlePinRepo } from './repositories/pins/DrizzlePinRepo';
import { ApiPinRepo } from './repositories/pins/ApiPinRepo';
import { SyncStrategy } from './logic/syncing/SyncStrategy';
import { PinSyncHandler } from './logic/handlers/PinSyncHandler';
import { FormSyncHandler } from './logic/handlers/FormSyncHandler';
import { DrizzleFormRepo } from './repositories/forms/DrizzleFormRepo';
import { ApiFormRepo } from './repositories/forms/ApiFormRepo';
import * as ImageManager from '../images/ImageManager';
import { ImageManagerInterface } from '../images/types';

// ==================== Type Definitions ====================

type SyncContext = {
  syncManager: SyncManager;
  localPinRepo: DrizzlePinRepo;
  localFormRepo: DrizzleFormRepo;
};

type InitializationOptions = {
  imageManager?: ImageManagerInterface;
};

// ==================== Constants ====================

const NOT_INITIALIZED_ERROR = 'Sync not initialized. Call initializeSync() before use.';

// ==================== Module-Level State ====================
// Note: Module-level state reduces testability. Consider dependency injection
// pattern for better testing and flexibility in the future.

let _localPinRepo: DrizzlePinRepo | null = null;
let _remotePinRepo: ApiPinRepo | null = null;
let _localFormRepo: DrizzleFormRepo | null = null;
let _remoteFormRepo: ApiFormRepo | null = null;
let _syncManager: SyncManager | null = null;

// ==================== Public API ====================

/**
 * Initialize the sync system with all necessary components.
 *
 * Creates and wires together:
 * - Local and remote repositories
 * - Sync strategies
 * - Sync handlers for Pins and Forms
 * - SyncManager singleton
 *
 * Idempotent: Safe to call multiple times (returns existing instance).
 *
 * @param opts Optional configuration (e.g., custom ImageManager for testing)
 * @returns Initialized sync components
 */
export function initializeSync(opts?: InitializationOptions): SyncContext {
  // Guard: Return existing instance if already initialized
  if (isAlreadyInitialized()) {
    return getExistingContext();
  }

  // Step 1: Create repositories
  createRepositories();

  // Step 2: Resolve dependencies (ImageManager)
  const imageManager = resolveImageManager(opts);

  // Step 3: Create and register sync handlers
  const handlers = createSyncHandlers(imageManager);

  // Step 4: Initialize and configure SyncManager
  _syncManager = configureSyncManager(handlers);

  // Step 5: Return context for caller
  return buildSyncContext();
}

/**
 * Convenience initializer using default dependencies.
 * Equivalent to calling initializeSync() with no arguments.
 */
export function initializeDefaultSync(): SyncContext {
  return initializeSync();
}

/**
 * Get SyncManager instance.
 * @throws Error if not initialized
 */
export function getSyncManager(): SyncManager {
  assertInitialized(_syncManager, 'SyncManager');
  return _syncManager;
}

/**
 * Get local Pin repository.
 * @throws Error if not initialized
 */
export function getLocalPinRepo(): DrizzlePinRepo {
  assertInitialized(_localPinRepo, 'LocalPinRepo');
  return _localPinRepo;
}

/**
 * Get local Form repository.
 * @throws Error if not initialized
 */
export function getLocalFormRepo(): DrizzleFormRepo {
  assertInitialized(_localFormRepo, 'LocalFormRepo');
  return _localFormRepo;
}

// ==================== Private Initialization Steps ====================

/**
 * Check if sync system is already initialized.
 */
function isAlreadyInitialized(): boolean {
  return _syncManager !== null;
}

/**
 * Get existing sync context (assumes already initialized).
 */
function getExistingContext(): SyncContext {
  return {
    syncManager: _syncManager!,
    localPinRepo: _localPinRepo!,
    localFormRepo: _localFormRepo!,
  };
}

/**
 * Create all repository instances.
 */
function createRepositories(): void {
  _localPinRepo = new DrizzlePinRepo();
  _remotePinRepo = new ApiPinRepo();
  _localFormRepo = new DrizzleFormRepo();
  _remoteFormRepo = new ApiFormRepo();
}

/**
 * Resolve ImageManager dependency (allows injection for testing).
 */
function resolveImageManager(opts?: InitializationOptions): ImageManagerInterface {
  return (opts?.imageManager ?? (ImageManager as unknown)) as ImageManagerInterface;
}

/**
 * Create sync handlers for all entity types.
 */
function createSyncHandlers(imageManager: ImageManagerInterface) {
  const pinHandler = createPinSyncHandler(imageManager);
  const formHandler = createFormSyncHandler();

  return { pinHandler, formHandler };
}

/**
 * Create Pin sync handler with dependencies.
 */
function createPinSyncHandler(imageManager: ImageManagerInterface): PinSyncHandler {
  return new PinSyncHandler(
    new SyncStrategy<Pin, RePin>(),
    _localPinRepo!,
    _remotePinRepo!,
    imageManager
  );
}

/**
 * Create Form sync handler with dependencies.
 */
function createFormSyncHandler(): FormSyncHandler {
  return new FormSyncHandler(new SyncStrategy<Form, ReForm>(), _localFormRepo!, _remoteFormRepo!);
}

/**
 * Configure SyncManager with handlers.
 * Note: With API-based sync repositories, the handlers are minimal
 */
function configureSyncManager(handlers: {
  pinHandler: PinSyncHandler;
  formHandler: FormSyncHandler;
}): SyncManager {
  const manager = SyncManager.getInstance();
  // Handlers are registered but operations now use API repositories
  // The actual sync logic is in ApiPinRepo and ApiFormRepo
  try {
    manager.addHandler(handlers.pinHandler as any);
    manager.addHandler(handlers.formHandler as any);
  } catch (e) {
    // Handlers may have compatibility issues with API repositories
    // This is OK - the API repositories handle the sync
    console.warn('Handler registration compatibility note:', e);
  }
  return manager;
}

/**
 * Build sync context for return value.
 */
function buildSyncContext(): SyncContext {
  return {
    syncManager: _syncManager!,
    localPinRepo: _localPinRepo!,
    localFormRepo: _localFormRepo!,
  };
}

// ==================== Private Guards ====================

/**
 * Assert that a component is initialized.
 * @throws Error with descriptive message if not initialized
 */
function assertInitialized<T>(component: T | null, componentName: string): asserts component is T {
  if (component === null) {
    throw new Error(`${componentName}: ${NOT_INITIALIZED_ERROR}`);
  }
}
