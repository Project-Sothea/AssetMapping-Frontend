# Production release preparation — 18 November 2026

Jerry authorized the production database cutover, both main pushes and a production iOS build. The backend rollout record is `AssetMapping-Backend/docs/operations/2026-11-18-production-village-cutover.md` in the sibling repository.

## Release behavior

- Village is required for newly created pins. Existing blank villages remain blank until edited. Forms derive their village from their parent pin; the independent village question and pin address control are removed.
- The village menu floats over the form, retaining the rectangular selector design without shifting Submit.
- Transfer-related database refreshes are coalesced; summary counts use SQL aggregates and stop polling during imports. Native asynchronous import writes remain deferred.
- The SQLite upgrade preserves the existing device database and application identity. Simulator native in-place upgrade, archive preservation, settings and queue preservation were verified earlier.

## Production dataset and one-time refresh

The cleaned source currently contains **208 pins and 268 forms**, with 13 existing blank-village landmarks. The original production database is retained for rollback, and no original photo objects are deleted.

Updating the binary preserves local data. It does not replace an old production cache with the cleaned dataset. All cleaned form IDs differ from the old production form IDs. Before the first post-cutover upload, old production devices need to confirm zero pending/failed uploads and unsynced records, then use **Clear Local Data**, followed by **Download**, to load the cleaned production snapshot. Keep/reconcile any unsynced records before clearing. No reinstall is needed. Devices with a saved test API URL must change that setting to production; a saved URL overrides the build default.

## Expo build archive

A frontend-only EAS build previously depended on a sibling backend directory for `@assetmapping/shared-types`. The production archive now includes the compiled package at `vendor/assetmapping-shared-types-0.1.0.tgz`, pinned by its lockfile integrity. `npm run types:vendor` rebuilds the backend package, packs it into this repository and updates the dependency filename and lockfile. Commit the resulting archive and lockfile whenever shared types change.

The user's existing preview `environment: production` setting is preserved. EAS production variables were inspected: `EXPO_PUBLIC_API_URL` points to `https://assetmapping-backend.up.railway.app`. The iOS bundle identifier remains `com.anonymous.AssetMapApp`; version is 1.0.2 and the production build number increments remotely.

Verification on the exact isolated EAS upload archive, with no sibling backend checkout:

- `npm ci --ignore-scripts`: success; compiled shared-type JavaScript and declarations present.
- Jest: **19 suites / 125 tests passed**.
- TypeScript: passed.
- iOS production-API JavaScript export: passed (Hermes bundle generated).
- Frontend lint/formatting: passed after the packaging change; tarball integrity matches the lockfile.

This verifies packaging and JavaScript compatibility. The signed EAS iOS build still needs to finish, followed by a physical-device TestFlight update check. An iOS build does not itself publish an App Store release.

## Release status

Production initial cutover deployment `2d6697de-d09d-443b-9d80-af7174a0fa40` succeeded. Production health, full pin/form API equality and exact SQL fingerprint passed, with the old production database unchanged. Backend main is `2fb984f`. The signed iOS build identifier will be recorded after launch.
