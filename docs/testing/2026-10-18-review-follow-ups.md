# Review Follow-Ups

Date: 18 October 2026

## Branch Ownership

- `feature/manual-data-transfer`: migration recovery, image path safety, API URL validation, socket reconnection, accessible transfer status, and current sync documentation.
- `fix/form-pin-and-photo-upload`: the shared corrections plus native file-backed photo uploads and failed-task cleanup.
- Shared corrections were carried between the dependent branches with cherry-picks. Neither PR nor main was merged. No force-push, deployment, production write, or credential change was performed.
- The unrelated local `eas.json` change is preserved outside these commits.

## Changes

Migration failure shows a retry screen rather than an empty app. Retrying remounts Drizzle's migration hook against the same connection; setup and editors stay blocked until success. There is no recovery action that deletes the database. The pre-existing legacy reset version remains unchanged; successful initial setup can still perform that previously approved reset on devices without its marker.

All image filesystem helpers reject unsafe pin IDs and filenames before constructing native paths. Downloaded references receive the same validation before snapshot insertion. Path separators, encoded paths, colon-prefixed schemes, control characters, empty names, and dot-directory components are rejected. Ordinary filenames with internal spaces remain supported. Existing malformed references are refused rather than used for deletion.

API URLs are normalized before validation and saving. Invalid hosts, non-HTTP schemes, credentials, query strings, and fragments are rejected. Saving resets the HTTP cache and forces only a socket reconnect; it never uploads or downloads records. Explicit disconnect detaches old socket handlers and invalidates asynchronous connection attempts.

Screen-reader labels include the current pending/failed state. README sync file descriptions reflect the manual workflow.

The photo branch uses Expo FileSystem's native binary upload task with a foreground file URI, rather than allocating photo bytes in JavaScript. Native PUT requests retain their 60-second deadline and best-effort cancellation. Cancelled or unsuccessful tasks cannot mark records uploaded. Failed requests preserve queued data for manual retry, and native errors do not expose signed URLs.

Review found that the installed Expo wrapper does not remove its progress subscription on rejection. The error path now requests cancellation to remove that subscription. Successful and failed retry tests use the real installed JavaScript wrapper with only its native bridge substituted.

## Automated Verification

- Manual-transfer branch: 64 tests across 10 suites pass.
- Photo bug-fix branch: 95 tests across 14 suites pass.
- Both branches pass TypeScript, ESLint, Prettier, and whitespace checks.
- Regression tests were observed failing before the corresponding changes for recovery controls, image-path rejection, URL normalization, forced reconnection, disconnect races, accessible status, file-backed upload, and progress-listener cleanup.
- Real Drizzle migration execution against migrated in-memory SQLite verifies rollback after a failed statement, preservation of a saved pin and pending queue row, successful retry on the same connection, and idempotent subsequent replay. Mounted recovery-screen tests separately check that edits/setup remain inaccessible on failure.
- Whole-change independent review identified the native listener leak; its failing regression now passes. Follow-up review found no newly introduced critical issue in that fix.

## Native Validation

- An unsigned Release simulator build passed. The separate app identifier `com.projectsothea.SoformReviewTest` leaves the prior test app and normal app data untouched.
- On iPhone 16 / iOS 18.6, a simulator-only injected migration error displayed the recovery message and Retry Database Setup button. Tapping Retry remounted the migration hook and proceeded successfully. The injected failure is not shipped in product code; real SQL rollback/retry is covered separately in the automated test above.
- A loopback-only mock server intentionally rejected the first photo-signing request with HTTP 503. The app retained the pin and form, reporting 1 failed and 1 blocked operation.
- Explicit retry uploaded a 2,097,152-byte synthetic file using the native file-backed PUT. The mock server confirmed exact byte count and expected leading bytes with `image/png` MIME type. Pin and form uploads followed in that order. Both server and native SQLite reported synced records.
- The native probe also confirmed that a traversal filename was rejected before constructing a file path. No unsafe file deletion was attempted.
- Independent Android Hermes bundle export passed with dummy API/map settings. This is a bundle check, not Android device testing.
- Timeout cancellation and rejected-task listener cleanup were verified with automated tests, including the actual installed Expo JavaScript wrapper. Native timeout interruption was not exercised in the simulator.

Android native testing remains pending at the user's request. No physical-device memory profiling, production object-store upload, or real Mapbox rendering is claimed by these checks.
