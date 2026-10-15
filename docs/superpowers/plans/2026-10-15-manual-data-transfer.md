# Manual Data Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace automatic data transfer with explicit upload, download, and local clearing while retaining the previously approved legacy reset.

**Architecture:** A shared transfer coordinator serializes setup, uploads, downloads, and clearing. SQLite retains local work and its outbox atomically; React Query displays local state, not automatic network refreshes. The existing backend sync API remains the write interface.

**Tech Stack:** Expo 54, React Native, TypeScript, Drizzle/Expo SQLite, AsyncStorage, React Query; Jest with jest-expo for mocked native tests.

**Spec:** `docs/superpowers/specs/2026-10-15-manual-data-transfer-design.md`

## Global Constraints

- Retain AsyncStorage key localDataResetVersion and version '1'. Never bump it in this release.
- Backend records are never deleted by clearing the device.
- Uploading never automatically clears data or downloads server records.
- Saving the API URL only changes configuration; it does not transfer data.
- Download Latest requires zero local pins/forms and zero outstanding operations.
- Block clearing when pending/failed operations or unsynced records exist.
- Preserve API configuration, device identity, reset marker, and map packs.
- Do not modify unrelated `eas.json` changes, deploy, or push this branch.

## Review Focus

- A successful server write followed by a timeout must retry using the same idempotency key (Task 2).
- A form saved on a new unsent pin must preserve the parent's create operation (Tasks 1-2).
- A download with an invalid final form must not leave a partially loaded device (Task 3).
- A reset completed just before process termination must not wipe newly collected responses again (Task 4).
- A second tab action or stale mounted editor must not mutate data during a transfer (Tasks 1, 5).

## Task 1: Atomic Local Saves and Transfer Exclusion

**Files:** Create `services/sync/transferCoordinator.ts`, `services/sync/queue/operationMerge.ts`; modify `services/sync/queue/queueOperations.ts`, `features/forms/services/FormService.ts`, `features/pins/services/PinService.ts`, `package.json`; create `jest.config.js` and `services/sync/__tests__/localWrites.test.ts`.

**Interfaces:** `runTransfer<T>(kind: 'setup' | 'upload' | 'download' | 'clear', action: () => Promise<T>): Promise<T>`; `assertLocalWritesAllowed(): void`; `getTransferState(): {kind: string | null; setupReady: boolean}`; `subscribeTransferState(listener: () => void): () => void`. Internal synchronous transaction-aware queue insertion accepts the Drizzle transaction client. Public save signatures remain unchanged.

- [ ] Add compatible Jest/jest-expo tooling, mocked SQLite/AsyncStorage boundaries, and a `test` script. Write failing tests: concurrent transfers reject; writes reject during setup/transfers; queue insertion failure rolls back the record; new pin plus form leaves parent queued as create.
- [ ] Run `npm test -- --runInBand services/sync/__tests__/localWrites.test.ts`; confirm behavioral failures before implementation.
- [ ] Implement coordinator with a synchronous lock acquisition before any await. Use synchronous Drizzle transactions (`.run()`/`.get()`/`.all()`, no async transaction callback) for records and queue writes. Parent touching and queue consolidation share the transaction. Guard deletes before image side effects.
- [ ] Implement consolidation: create+update=create, create+delete=cancel, update+delete=delete. Cancelling unsent pins also cancels local child records/operations. Editing preserves the existing create type and assigns a new payload key.
- [ ] Re-run tests and TypeScript, then commit only this task's files.

## Task 2: Explicit Complete Upload Sessions

**Files:** Modify `services/sync/queue/syncQueue.ts`, `services/sync/queue/queueState.ts`, `services/sync/queue/queueOperations.ts`, `services/sync/queue/syncOperations.ts`, `services/sync/queue/types.ts`; create `services/sync/__tests__/manualUpload.test.ts`.

**Interfaces:** `uploadPendingChanges(onProgress?: (done: number, total: number) => void): Promise<UploadResult>` where `UploadResult` has `uploaded`, `failed`, `blocked`, `remaining` numbers and `errors: {entityId: string; entityType: string; message: string}[]`. `processOperation` receives the persisted operation key and passes it through every sync call.

- [ ] Write failing tests for 25 operations completed in one session, no processing two seconds after enqueue, stable retry key after timeout, parent failure blocking children, conflict preserving the local payload, and restart leaving work pending rather than auto-resuming.
- [ ] Run `npm test -- --runInBand services/sync/__tests__/manualUpload.test.ts` and confirm failures.
- [ ] Remove processing timers and scheduled retries. Snapshot pending/failed operations under the coordinator and process once per explicit session, with parent upserts before child upserts and child deletes before parent deletes. A failed parent blocks dependent forms; unrelated items continue. No automatic network retry loop.
- [ ] Pass stored idempotency keys instead of generating request-time UUIDs. Confirm existing backend idempotency response compatibility with repeated keys using mocked endpoint responses and inspected backend code, not production writes.
- [ ] Make conflicts return failures without calling pullPinUpdate/pullFormUpdate or marking completion. Calculate session counts from actual acknowledgements, not historical completed rows. Persist failure messages for retry display.
- [ ] Re-run tests and TypeScript; commit task files.

## Task 3: Empty-Only Downloads and Protected Local Clearing

**Files:** Create `services/sync/localDataTransfer.ts`; modify `services/sync/pullUpdates.ts`, `services/sync/syncMetadata.ts`; create `services/sync/__tests__/localDataTransfer.test.ts`.

**Interfaces:** `getLocalDataSummary(): Promise<{pins: number; forms: number; pending: number; failed: number; unsynced: number}>`; `downloadLatest(): Promise<{pins: number; forms: number}>`; `clearLocalData(): Promise<{cleanupWarnings: string[]}>`. Internal snapshot download helper supports setup while the coordinator is already held (no nested locking).

- [ ] Write failing tests: any local pin/form blocks download; outstanding delete queue blocks download even with empty tables; historical completed queue does not block; malformed last form or missing parent leaves no partial writes; stale editor cannot race download/clear; orphaned unsynced row blocks clear.
- [ ] Run `npm test -- --runInBand services/sync/__tests__/localDataTransfer.test.ts` and confirm failures.
- [ ] Fetch complete API pin/form lists and sanitize/validate all records before writing. Treat per-record failures as download failures. Insert the entire snapshot within a synchronous SQLite transaction, then update metadata; metadata persistence errors must surface truthfully without presenting the committed snapshot as empty.
- [ ] Implement transactional local clearing after rechecking outstanding queue/unsynced records. Clear only local entity tables, completed history, and cursor. Gather scoped image references before deletion and clean via ImageManager afterward; report cleanup warnings separately. Preserve reset marker/preferences/map packs. Never invoke backend entity deletes.
- [ ] Run tests and TypeScript; commit task files.

## Task 4: One-Time Setup and Removal of Automatic Transfers

**Files:** Modify `services/sync/localDataReset.ts`, `services/sync/syncService.ts`, `hooks/RealTimeSync/useInitialSync.ts`, `hooks/RealTimeSync/useRealTimeSync.ts`, `services/websocket/WebSocketManager.ts`, `app/_layout.tsx`, `features/sync/components/ApiUrlConfiguration.tsx`; create `services/sync/__tests__/setupAndTriggers.test.ts`.

**Interfaces:** `initializeLocalData(): Promise<void>` runs under setup exclusion. `resetLocalDataOnce(): Promise<boolean>` returns whether reset occurred. Keep public manual-transfer interfaces from Tasks 2-3; remove or redirect unused bidirectional sync APIs so no hidden push/pull path remains.

- [ ] Write failing tests: absent marker causes one reset/download attempt; existing marker causes neither; failure/relaunch never repeats a completed reset; offline setup permits later manual retry; save API URL/reconnect/notifications cause no transfers.
- [ ] Run `npm test -- --runInBand services/sync/__tests__/setupAndTriggers.test.ts` and confirm failures.
- [ ] Persist the existing version '1' marker after transactional local reset, before initial download. Block UI editing until marker check/reset finishes. Startup download failure unlocks a recoverable empty state, retaining the marker. Fail closed on unknown marker/reset storage errors rather than allowing edits before reset.
- [ ] Remove automatic queue processing and record pulls from WebSocket notifications/reconnects. API URL save persists configuration/cache reset only. Keep connection status separate from uploaded-data status.
- [ ] Replace the initial automatic full sync hook with setup initialization only. Remove obsolete timer/push entry points and verify with `rg` that no automatic call site remains.
- [ ] Run tests and TypeScript; commit task files.

## Task 5: Transfer Controls, Honest Status, and Release Verification

**Files:** Create `features/sync/components/DataTransferControls.tsx`, `hooks/RealTimeSync/useTransferState.ts`; modify `app/(tabs)/download.tsx`, `shared/components/SyncStatusBar.tsx`, `features/forms/components/FormEditor.tsx`, relevant pin editing controls, `README.md`; create `services/sync/__tests__/transferControls.test.tsx`.

**Interfaces:** `useTransferState()` subscribes to coordinator state and exposes busy/setup readiness. Controls consume Tasks 2-3 interfaces; counts are operations/changes, not patient counts. Save confirmations say 'Saved on this device'.

- [ ] Write failing UI tests for double-tap exclusion, pending/failed counts, progress/session results, error details, clear confirmation/cancellation, empty-only download, and blocked stale editor mutations. Verify no-success message for partial upload.
- [ ] Run `npm test -- --runInBand services/sync/__tests__/transferControls.test.tsx` and confirm failures.
- [ ] Add separate icon-labelled Upload, Download Latest, and Clear Local Data commands to the Download tab. Expose failure details and retry without clearing successful records. Keep map-pack UI separate. Replace misleading global 'Synced' text with 'No pending uploads' and remove automatic-retry copy.
- [ ] Subscribe editors and controls to shared exclusion state; retain service-level write guards. Invalidate pin/form/metrics caches after transfers and clearing. Keep failure feedback recoverable without dismissing unsaved forms.
- [ ] Document manual workflow and destructive legacy-reset release warning. Run `npm test -- --runInBand`, `npx tsc --noEmit`, `npm run lint`, and `git diff --check`. All must pass or have explicit residual limitations recorded.
- [ ] Run iOS/Android simulator/device checks using isolated non-production data: offline collect/restart, upload 25+ changes, timeout/retry, app resume, clear/download, legacy update and existing marker. Report any unavailable native validation rather than claiming coverage. Inspect mobile layouts for overlap.
- [ ] Review the whole branch for unintended production writes, silent overwrites, reset-version changes, and unrelated files. Commit verified app work. Do not push/build/deploy without a further request.

## Execution Handoff

Recommended execution: native implementation in this session, tasks sequentially,
then a fresh whole-branch review. The tasks share transaction and coordinator
interfaces; sequential implementation keeps these contracts coherent. Review
this plan before implementation starts.
