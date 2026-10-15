# Manual Data Transfer Design

## Purpose and Scope

Field teams must save responses offline and choose when to upload, download,
or clear local data. Network failures must not invalidate a successful local save.
Keep the previously approved one-time legacy reset for devices that have not run
it. Backend records are never deleted by clearing the device.

This change covers the mobile transfer workflow and targeted queue correctness
fixes. New villages, optional-field validation, and Android black-screen diagnosis
are separate work. Do not claim that changing sync fixes those issues.

## Existing Code

- FormService and PinService save SQLite records, then enqueue writes.
- syncQueue schedules processing after enqueue and again after each batch.
- Startup, WebSocket notifications/reconnects, and API URL changes can push data.
- processQueue handles at most ten operations and swallows per-operation errors.
- Queue consolidation replaces an earlier operation type, including create.
- Conflict handling currently overwrites local work with server data and reports
  completion. Download processing also overwrites existing local rows.
- SyncStatusBar can report success while operations remain pending.

## Agreed User Workflow

1. Save pins/forms locally; show saved-on-device feedback.
2. Tap Upload to send pending changes, including failed operations on retry.
3. Review uploaded, failed, and remaining counts.
4. Optionally tap Clear Local Data, confirm, and clear the device only.
5. Tap Download Latest only when there are no local pins/forms or outstanding
   queue operations.

Uploading never automatically clears data or downloads server records. Saving
the API URL only changes configuration; it does not transfer data.

## One-Time Legacy Setup Exception

Retain AsyncStorage key localDataResetVersion and version '1'. Never bump it in
this release. Devices already carrying this marker must not flush again.

After SQLite migrations, block record editing and all transfer actions until
setup checks the marker. If absent, perform the approved destructive local reset
once: clear forms, pins, and queue, clear the sync cursor, and persist the same
marker. Preserve API URL, device identity, map packs, and other preferences.
Explain in release notes that unsent legacy responses will be lost, and require
the team to back up needed records before updating.

Then attempt one initial backend download as the agreed setup exception. If it
fails, show a recoverable error and let the user retry manually. Do not repeatedly
clear the device or repeat automatic downloads on later launches. A completed
reset marker is retained through manual local clears.

## Transfer Service and Concurrency

Use one shared transfer coordinator for startup setup, upload, download, and
local clearing. Only one operation can run at a time. Disable edits during these
operations, including form save/delete and pin mutations, so a snapshot cannot
change under an upload or be erased during clearing. Enforce checks in services,
not just disabled buttons. Startup setup completes before exposing editing.

Remove queue timers and all automatic push/pull calls from startup hooks,
WebSocket notifications/reconnects, and API URL configuration. A socket may keep
connection status, but must not transfer records. Do not keep hidden auto-retry.

## Offline Saving and Queue Correctness

Persist a record change and its queue entry atomically so a local save cannot
succeed with no uploadable operation. Include parent-pin touching within the
same save boundary where applicable.

Consolidate offline operations without losing create semantics: create followed
by edit remains create; create followed by delete cancels unsent creation;
update followed by delete becomes delete. Account for child-form queue entries
when cancelling a new pin. Never let a form upload before its parent exists.

## Manual Upload

Snapshot eligible operations when Upload is tapped. Process the entire snapshot,
not just ten entries. Upload parent pins before dependent forms. If a parent
fails, leave its dependent forms pending with an explanatory reason.

Return structured session results, including uploaded, failed, blocked, and
remaining operation counts. Label queue counts as changes, not patients: one
form save may queue both a pin and a form. Show affected pin/form names and
actionable errors for failures. Completed historical queue entries are not the
current session's success count.

Keep a stable idempotency key for retrying the same operation payload, and check
backend support for passing that key through the existing sync endpoint. New
edits receive a new key. Timeout or interrupted sessions leave recoverable work;
relaunch never silently resumes uploading.

Version conflicts remain failed locally with the response preserved. Do not pull
over local work or count a conflict as success. Resolve conflict tooling later;
this release may report that team assistance is required.

## Manual Download

Check SQLite immediately before beginning: pins=0, forms=0, and pending/failed
operations=0. Historical completed queue entries do not block download. Reject
download otherwise, even when all local records are already uploaded.

Fetch and validate the full pins/forms snapshot before replacing local data.
Commit the validated snapshot in one SQLite transaction, pins before forms.
Missing parent references or malformed records fail the download rather than
silently skipping records. Preserve the empty local state after failure, allowing
a manual retry without bypassing the empty-device rule. Update sync metadata
only after successful commit. Downloading records never enqueues uploads.

## Manual Clear

Require explicit confirmation and recheck under the shared coordinator that
there are no pending/failed operations or unsynced records. Block clearing when
these exist, including records left without queue entries by older builds.

Delete local forms, pins, and completed queue history atomically; clear the sync
cursor and invalidate relevant query caches. Preserve the legacy reset marker,
API settings, device ID, and offline map packs. Remove scoped pin-image files
after database clearing using existing image-management APIs; file cleanup
failure must be reported without falsely restoring cleared records. No backend
delete requests are generated.

## UI

Reuse the Download tab for a data-transfer section with separate Upload,
Download Latest, and Clear Local Data commands. Leave map-pack controls distinct.
Show pending/failed counts, active-session progress, and a persistent result
summary with failure details. Use the existing icon library and restrained app
styling. Replace misleading 'Synced' text with a queue-specific status such as
'No pending uploads'; this does not imply the device mirrors the server.

## Verification

- No automatic network transfer on save, app reopen, reconnect, notification,
  API URL save, or the old two-second timer interval after setup.
- Offline saves survive restart and produce uploadable queue entries atomically.
- More than ten changes upload in one explicit session, with accurate totals.
- New pin plus form, repeated edits, cancellation, deletion, parent failures,
  conflicts, timeout/retry, and interrupted uploads preserve data correctly.
- Duplicate taps and concurrent entry points cannot overlap transfers or edits.
- Clear is blocked by pending, failed, or orphaned unsynced records.
- Download is blocked by any local pin/form and commits all-or-nothing.
- Legacy marker absent triggers exactly one reset and one initial download
  attempt; marker present never triggers another reset. Test skipping build 14,
  offline startup, failed initial download, and relaunch.
- Verify iOS and Android UI/device workflows, TypeScript, lint, and formatting.
  Use mocks for automated tests; never reset or mutate production data in tests.

## Release Boundary

Implement and verify on a feature branch. No GitHub push, backend deployment,
EAS build, or TestFlight submission is included without a further release
request. Communicate the destructive legacy-reset exception before distribution.
