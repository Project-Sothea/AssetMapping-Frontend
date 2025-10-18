## Sync service

This package contains the synchronization subsystem for the app. It is grouped into
smaller, meaningful buckets so consumers can import just what they need.

Public surface (import from `services/sync`):

- `initializeSync`, `initializeDefaultSync`, `getSyncManager`, `getLocalPinRepo`, `getLocalFormRepo` — runtime initializers and getters.
- `orchestration` — SyncManager, BaseSyncHandler, SyncStrategy, and core logic types.
- `handlers` — concrete handler implementations (PinSyncHandler, FormSyncHandler).
- `repos` — repository interfaces and implementations (Drizzle/Supabase).
- `images` — image manager implementation and types.
- `types` — shared types: `SyncRawState`, `DisplayStatus`, `ImageManagerInterface`, repository interfaces, etc.

Why this layout?

- Minimizes module-level side-effects. Call `initializeSync()` in your app bootstrap (after DB migrations) to wire up runtime dependencies.
- Keeps the public surface small and intention-revealing.
- Makes it easy to swap adapters in tests.

Examples

```ts
import { initializeDefaultSync, getSyncManager } from 'services/sync';
import { orchestration, handlers, repos, images, types } from 'services/sync';

initializeDefaultSync();

const manager = getSyncManager();
const state = manager.getState();
```

Notes

- The barrels re-export existing files; no files were moved. If you choose to physically reorganize files on disk later, update these barrels accordingly.

## SyncManager (what it does)

Singleton orchestrator for sync operations.
Registers handlers (addHandler) and keeps a handlers[] list.
Tracks sync state: isSyncing, lastSyncedAt, lastSyncFailedAt, lastSyncFailure.
Exposes a public sync entrypoint (syncNow) that runs the sync flow (deduplication, error handling).
Notifies UI/consumers via subscribe(listener) / notifyListeners() and exposes getDisplayStatus() for status text/color.
Encapsulates sync lifecycle helpers: setSyncStart, setSyncEnd, setSyncSuccess, setSyncFailure.
Intended responsibility: domain-agnostic orchestration of registered handlers + state reporting (should not contain platform concerns).

## SyncService (likely what it does)

Thin platform-level service that uses SyncManager for actual sync work.
Typical responsibilities (check your syncService.ts to confirm):
Triggering periodic or event-driven syncs (timers, background tasks, app lifecycle).
Responding to network/AppState/foreground/background/Push events and deciding when to call SyncManager.syncNow().
Higher-level debounce/queue logic and top-level error reporting (toasts, logs).
Optionally wiring SyncManager.subscribe() into UI/global state.
Intended responsibility: integrate sync orchestration with the app environment (network, battery, background), not hold sync logic itself.
