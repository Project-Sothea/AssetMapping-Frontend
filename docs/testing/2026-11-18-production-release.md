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

This verifies packaging and JavaScript compatibility. The signed EAS iOS build finished successfully. A physical-device TestFlight update check remains after submission. An iOS build does not itself publish an App Store release.

## Release status

Production initial cutover deployment `2d6697de-d09d-443b-9d80-af7174a0fa40` succeeded. Production health, full pin/form API equality and exact SQL fingerprint passed, with the old production database unchanged. Backend main is `2fb984f`; its GitHub-triggered deployment `8f65b164-6e38-4dd2-840a-245e493fb2f7` succeeded after approving that specific commit in Railway. Ordinary Drizzle migrations completed, health returned 200 and the complete cleaned SQL hash stayed unchanged. Frontend release code is `20c9952`.

Production signed iOS build **1.0.2 (16)** finished successfully: [EAS build 894092c2-fd58-46f6-aafe-21782f1269a2](https://expo.dev/accounts/j4ryl/projects/AssetMapApp/builds/894092c2-fd58-46f6-aafe-21782f1269a2). It uses the existing remote distribution certificate/profile and the production API environment. The signed App Store distribution artifact is available in EAS. This task started and completed the build; it did not submit it to App Store Connect or publish an App Store release.

## Cloud build diagnostics

The first cloud checks reported missing direct declarations for `expo-font` and `react-native-worklets`, plus existing Expo package-version warnings. The actual prebuild and CocoaPods logs confirmed both modules were found and linked (`ExpoFont 14.0.10`, `RNWorklets 0.7.1`). Prebuild, CocoaPods, bundling, Xcode compilation and signed archive creation all completed successfully. This release does not broadly update the SDK or native dependency versions; do not describe Expo Doctor as passing. Align the dependency declarations and SDK versions in a separately verified native dependency update.

## Build 15 download mismatch and TestFlight submission

The user confirmed their installed app is **1.0.2 (15)**. Its schema still requires `forms.village`, so its Download Latest validation rejects the migrated server response before importing anything. The new database migration runs only when build 16 is installed; reinstalling build 15 cannot apply it. Production was cut over before build 16 was available in TestFlight.

Build 16 submission was attempted using the existing production submit profile: [submission 2979898e-6040-430a-85a4-692ef7ed3f45](https://expo.dev/accounts/j4ryl/projects/AssetMapApp/submissions/2979898e-6040-430a-85a4-692ef7ed3f45). It failed on 18 November at 14:39:47 SGT with `EAS_ASC_REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`. Apple requires the Account Holder to accept the pending agreement in App Store Connect → Business and, if prompted, the Apple Developer account portal. No legal agreement was accepted by the agent. The same completed build can be submitted again after acceptance; a rebuild is unnecessary. Until then build 16 is not available to testers.

After successful submission and Apple processing, update the existing TestFlight installation to **1.0.2 (16)**, open it so the local migration runs, and retry Download Latest. Do not clear unsynced records or reinstall as a workaround. No backend data was changed while diagnosing this mismatch.

## Successful TestFlight upload after agreement acceptance

After the Account Holder accepted an additional Apple agreement, submission **`e43411be-9873-4295-8685-d27201803dc1`** finished successfully on 18 November 2026 at **14:47:03 SGT**, reusing build **1.0.2 (16)**. No rebuild or reinstall was required. Earlier retry `560a49e0-e1af-4e84-85ba-a6c195a63910` had still received the agreement error.

App Store Connect subsequently reported build 16 as **VALID / IN_BETA_TESTING** for internal testers, and **READY_FOR_BETA_SUBMISSION** for external testers. Internal availability is verified; external Beta App Review/distribution is not complete. This is not a public App Store release.

Apple warning 90725 about the iOS 26 SDK did not block this upload or internal testing. Apple’s published deadline requires iOS 27 SDK or later for new uploads starting April 2027: https://developer.apple.com/news/?id=k1mtkt1k . Upgrade and verify the Expo/Xcode toolchain before that deadline; the build SDK requirement is separate from the minimum iOS version supported on users’ phones.
