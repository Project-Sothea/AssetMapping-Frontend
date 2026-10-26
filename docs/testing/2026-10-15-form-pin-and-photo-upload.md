# Form Pin Link and Photo Upload Fixes

Date: 15 October 2026

Branch: `fix/form-pin-and-photo-upload`, based on `feature/manual-data-transfer` at `01a0ad5`.

## Scope

Fix new-form parent association and make photo transfers recoverable and diagnosable. Draft recovery, Android native testing, production configuration changes, pushes, and deployments are not included.

## Findings and Changes

- The form previously trusted `pinId` carried in editable form values. A missing or stale value could reach persistence. Submission now takes the parent ID from the open pin, or the original selected form during editing, and overrides hidden form state. Missing screen context keeps the editor open with an actionable error. The SQLite service also rejects absent, blank, or non-string IDs before querying the parent.
- The exact physical-device sequence that originally lost the ID was not reproduced. Regression tests deliberately remove or corrupt the hidden ID while exercising the actual editor, resolver, mutation hooks, and SQLite service. They prove this submission path no longer depends on that hidden value.
- Photo uploads previously read a `file://` URL through generic fetch and had no timeout on the storage PUT. The changed path reads native file bytes using Expo FileSystem and sends them with Expo fetch. This avoids the file-URL fetch dependency; it does not establish that file-URL fetch caused the reported production failure.
- Missing, empty, and unreadable files fail without marking the pin uploaded. PUT requests abort after 60 seconds. Errors identify whether signing, file reading, storage HTTP response, or the connection failed. Native network errors do not expose signed URLs.
- Signing and PUT use the same MIME type, including HEIC/HEIF and WebP rather than treating them as JPEG.
- Failed or malformed remote image-list requests stop metadata updates instead of assuming an empty remote list. The API contract requires a string array, including `[]` for no images.
- HTTP failures now retain the status and backend `error` or `message` field, including when the response is HTML rather than JSON.
- Photo failures leave pins and dependent forms local and retryable. The pin is not sent as successful without its photos.

## Automated Verification

66 tests across 8 suites pass. TypeScript, ESLint, Prettier, and diff checks pass.

Regression tests were observed failing before the corresponding fixes for lost form association, invalid parent IDs, file-URL-independent transport, MIME handling, storage error context, upload timeout, failed remote metadata lookup, malformed remote metadata, and HTTP error preservation. Additional coverage checks empty/unreadable files, PUT rejection, signed-URL redaction, and edits to remote-only photos.

Independent review identified the missing/null remote metadata fallback; it was removed and covered with failing-then-passing tests.

## Native iOS Validation

- Separate iPhone 16 simulator, iOS 18.6; application identifier `com.projectsothea.SoformManualTest`.
- Unsigned local Release simulator build succeeded. No EAS build or deployment occurred.
- Only synthetic records and a small binary file fixture were used with a mock server on `127.0.0.1:18880`.
- First signing request intentionally returned HTTP 503. The native app reported 1 failed pin and 1 blocked form, with both retained locally.
- A second explicit upload succeeded. The mock storage endpoint received exactly `[137, 80, 78, 71]` with `Content-Type: image/png`. Pin and form were subsequently sent in that order; native SQLite showed both synced.
- Through the actual native form UI, created `NATIVE PIN LINK TEST` under the disposable photo pin, selected the village, left optional answers blank, and saved. The success alert appeared and the form list remained visible. Native SQLite showed the correct parent UUID and `unsynced` state, confirming no automatic upload after saving.
- The native transport/form build preceded the final stricter malformed-metadata guard; that final guard is covered by the automated suite.

This tests byte transport, failure recovery, and form persistence, not photo picking, full-size image memory use, physical devices, real object storage, or real Mapbox tiles. Android remains pending.

## Production Storage Blocker

A read-only request to the live backend's `/api/storage/upload-url` using a diagnostic filename returned HTTP 500 with an HTML Internal Server Error response. No object upload, sync write, deletion, or credential change was performed against production.

The backend `.env` on this Mac contains nonblank values for all five of:

- `AWS_S3_BUCKET_NAME`
- `AWS_ENDPOINT_URL`
- `AWS_DEFAULT_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Values were not printed or validated. Railway service variables and live storage availability remain unverified. Missing configuration, invalid credentials, a deleted bucket, or another storage-service error cannot be distinguished without the backend log and live configuration check.

Check these variables on the Railway **backend service**, restore access to the intended object-storage bucket, and inspect its signing error logs. Keep storage credentials server-side. After configuration is restored, validate a disposable photo upload with explicit permission before calling production photo transfers fixed.

The user subsequently indicated the storage service or credentials might no longer be available. This is consistent with the failure but does not establish its exact cause. The local fixes do not restore external storage by themselves.
