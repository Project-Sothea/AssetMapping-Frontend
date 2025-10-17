// Public API for services/sync
// This file provides a compact, well-organized public surface for the sync package.
// It groups core orchestration, adapters (implementations and repositories),
// and shared types so consumers import from a single place.

export * from './syncService';
export * from './utils/formatSyncStatus';

// Simplified public groups:
// - orchestration: SyncManager, BaseSyncHandler, strategy/types
// - handlers: concrete handler implementations
// - repos: repository interfaces and implementations
// - images: image manager and types
// - types: shared type exports

export * as handlers from './logic/handlers';
export * as repos from './repositories';
export * as images from './logic/images';
