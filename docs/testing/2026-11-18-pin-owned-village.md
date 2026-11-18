# Pin-owned village rollout — 18 November 2026

## Scope and behavior

Test API: https://assetmapping-app-test-migration-test.up.railway.app. Production remains unchanged. Use the updated frontend with this migrated API; older app versions and the new database contract are not compatible.

New pins require Krang Svat, Srae Ou, Svay Sor, Boeung Tim or Test Village. Existing blank landmarks can remain blank when edited; select a village before adding a form to one. Forms display the current pin village through their foreign key. `villageId` remains the household code. Address inputs/details are removed but stored Address data remains.

## Verified locally

- 123 frontend tests pass, including existing database upgrade, independent legacy village archive, rollback/retry, foreign keys, queue preservation, new/blank pin validation, inherited village changes, and removal of old form fields from writes.
- Frontend type checking and lint pass. Metro produced an iOS bundle. This proves bundling, not installation or native runtime behavior.
- Backend build/lint and four contract, fingerprint and HTTP error-response tests pass. Disposable PostgreSQL rehearsal preserves all 208 pins and 268 forms, compares every remaining survey field, and tests conflict refusal, backup failure/retry, rollback/reapply, new forms and edited parent villages.
- SQL reads coalesce at the source: 50 close notifications produce one query, and transfer events produce no reads until completion. Summaries and queue metrics use aggregate counts; polling pauses during transfers. True asynchronous native bulk writing is deferred pending separate platform/transaction testing.

## Device update checklist

1. Before updating a device caching the old production dataset, confirm Upload Pending is empty and there are no failed or unsynced changes. If there are, preserve/recover them before proceeding. In the **old app**, use Clear Local Data to remove old IDs.
2. Install the update over the existing app with the same bundle/package identity and signing. Reinstallation is not the intended path. A native in-place simulator update is now verified (see below). A physical TestFlight/App Store update has not been tested here.
3. In Settings, explicitly set the test API above. Saved settings override the build default. The local ignored frontend `.env` now points at test; cloud build environment settings must be checked separately.
4. Use Download Latest. Expect 208 pins, 268 forms and 13 blank-village landmarks. Verify offline maps, an existing survey, new pin selection, form creation and inherited village after a pin edit.
5. If already updated with an old cache, the migration preserves independent old village values in `form_village_archive`; it does not auto-reset nonempty data or queued work. Legacy queued form writes are blocked and preserved. Inspect/recover any pending work before clearing. If startup itself fails, keep the app data intact and capture the error; do not uninstall as a first recovery step.

Schema upgrade alone does not replace old production IDs with cleaned test IDs. Do not upload stale production rows into the cleaned dataset. The new downloader refuses the previous server schema so selecting production by mistake cannot silently discard its independent village answers.

## Railway rollout and rollback

Project: `533b3081-a0af-4253-ab93-46fd334a4d0c`; environment: `72536ee3-2165-4348-8650-f4d825cdcd04` (`migration-test`); app: `3c152b3e-6d17-4145-a509-1e7518104a7c`; database service: `2d94d41c-9256-4d30-b418-68cc60b37db9` (`postgres-app-test.railway.internal`).

Pre-rollout successful app artifact: `463ee2bc-e52a-4a8c-b794-1c14b078df08`, snapshot `0ce56967-2710-4b76-a3c2-aa9894084eff`. Backend feature revision: `eef9f4fd9cb25fe96ea7aef671a42d259a265c55` on `feature/pin-owned-village`.

The previous source was a CLI upload with no Git source attached; builder RAILPACK/V3; start/build/pre-deploy commands and healthcheck were unset. Networking, variables and database connection must remain unchanged.

Upload the committed backend feature revision directly with Railway CLI (no GitHub source is attached) with build `npm run build`, start `npm run start`, healthcheck `/health`, and pre-deploy `node scripts/migrate-pin-village.mjs --confirmed-test-target`. The migration requires the exact audited target and full raw SQL baseline fingerprint. A read-only audit confirmed that the API baseline differs only because NULL answer arrays are decoded as empty arrays; both fingerprints are retained. It creates a unique full backup schema in the same database, archives old village values, then removes the two columns and verifies answers before committing. Supplementary `/tmp` snapshots are ephemeral; the database backup schema is durable. See the backend `scripts/README.md` for commands and verification details.

To roll back, stop writes. From Railway, set pre-deploy to `node scripts/rollback-pin-village.mjs --confirmed-test-target` and redeploy the new artifact once; verify success, then clear pre-deploy and restore the old artifact. Alternatively, execute `node scripts/rollback-pin-village.mjs --confirmed-test-target` from the deployed backend revision with that test service's variables, **clear the forward pre-deploy command**, and restore artifact `463ee2bc-e52a-4a8c-b794-1c14b078df08` plus the previous source/build settings. Rollback retains current answers/new forms and follows post-migration pin-village edits. Do not rerun forward migration as part of restoring the old artifact. Keep updated devices offline during a backend rollback. Do not simply install the old app over an upgraded device database: its retired columns are absent and Clear Local Data clears records, not the schema. A mobile downgrade needs a separately verified device-schema restore (using the local archive) or a deliberate database reset after all work is preserved. That recovery/install path has not been verified here; the tested rollback is for PostgreSQL/backend. No mobile release has been distributed by this task. Never target production by substituting its credentials into these commands.

## Remote result

Healthy test deployment: `3855d5ef-62f1-4902-853a-805d212559da`, revision `eef9f4fd9cb25fe96ea7aef671a42d259a265c55`. The schema migration committed in deployment `77a0b0b0-1902-4a14-b095-ec5ddf949beb`; the final deployment verified it was already applied. Full durable backup: `village_backup_1794971911402_6287f8` (pins and forms), plus `public.form_village_archive`. Supplementary pre-deploy filesystem backup was `/tmp/sothea-village-backup/attempt-SQpl6k` and must not be relied on for persistence.

Live before/after comparison passed for every pin field and every remaining form field: 208 pins, 268 forms, 13 blank pins, zero orphans, retired village keys absent. Temporary API probes verified required-village rejection (HTTP 400 JSON), blank-parent form rejection, Test Village pin creation, form creation without village fields, parent-village edit inheritance, and idempotent retry. All probe rows were deleted and the complete original active dataset matched again afterward. No pending Railway changes remain.

Production was not deployed, migrated or switched. The frontend feature branch is ready for review. A standalone native simulator build has now been installed and verified in place; no TestFlight/App Store release has been distributed.

## Native iOS in-place update verification

On 18 November 2026, a standalone Release build of frontend revision `b52a16a6343b6408920c79f4e5338bc4b9ce2ea8` was built with Xcode and tested on iPhone 16 / iOS 18.6. The normal older simulator app was installed once in an isolated simulator and given a copy of its existing records, queued operations, photo and settings plus the private full pre-migration 208-pin/268-form snapshot. It opened normally before the update. The new app was then installed **over it**, retaining the same test bundle ID (`com.projectsothea.SoformManualTest`) and increasing its build version from 1 to 2. The shipped JavaScript bundle was identical to the current native build; only simulator package identity/version metadata was adjusted.

No uninstall, Clear Local Data, queue processing or upload was performed. iOS rotated the app data-container path during installation, but preserved its contents. Comparing every stored pin field and every remaining form field before/after confirmed:

| Check                                        | Before |                  After update and cold restart |
| -------------------------------------------- | -----: | ---------------------------------------------: |
| Pins (full snapshot plus existing fixtures)  |    210 |                                            210 |
| Forms (full snapshot plus existing fixtures) |    271 |                                            271 |
| Queue rows                                   |      4 | 4, byte-equivalent values and idempotency keys |
| Pending changes                              |      2 |                                              2 |
| Cached photo files                           |      1 |                           1, identical SHA-256 |
| Migration journal entries                    |      4 |                   5, unchanged on cold restart |
| Foreign-key violations                       |      0 |                                              0 |

All 271 retired village/otherVillage values and parent villages were preserved in the archive. Household codes and survey answers were unchanged. AsyncStorage settings, including the saved test API URL and last-sync value, matched exactly. The updated UI opened an existing fixture form and showed no village question.

A second native update case removed the setup marker from an older nonempty installation: its 2 pins, 1 form and 2 queue rows survived, and the app adopted marker version 1 without resetting/downloading.

The original simulator was left untouched. The populated updated app remains available in **SOFORM Native Upgrade Verification** (`EC8DB080-9696-44DC-B1CB-C55AE6610B58`), on its data-transfer screen. De-identified machine-readable results are in [the verification report](evidence/2026-11-18-ios-in-place-update.json). Private database snapshots, simulator packages and before/after screenshots are outside the repository at `/tmp/sothea-ios-upgrade-evidence`.

The local native build required temporary corrections to generated shell-script quoting for the workspace path containing spaces and the local Node path. All those build-only changes were restored; no runtime code fix was needed for this test. No downloaded offline-map pack was present, so map-pack retention was not tested. Physical-device distribution/signing remains a separate release check. The simulator result supports a normal in-place update with the same application identity; reinstallation is not required for the tested migration.

## Village control follow-up

Restored the rectangular `VillageSelect` appearance from the earlier village-dropdown branch, replacing the pin-list filter control inside the pin form. Both the form and pin details now say **Village**. The five canonical options, including Test Village, open in a floating menu; the menu does not resize the form or move Submit. Selecting an option closes it.

Native iPhone 16/iOS 18.6 screenshots confirmed that the visible Submit button pixels stay at y=1428–1531 both closed and open. Test Village was selected successfully. The full local dataset (210 pins/271 forms), queue, settings and cached photo still matched the pre-update snapshot. All 124 tests, TypeScript and lint pass. See [the layout evidence](evidence/2026-11-18-village-popup.json); screenshots are in `/tmp/sothea-village-popup-preview`.

Upload new or re-saved records only to the migrated test backend. Do not upload the simulator's disposable fixtures into the shared dataset. Legacy queued form payloads containing the retired village fields are preserved and blocked until the form is reviewed and re-saved in the updated app. Updating the app does not merge old production IDs into the cleaned test dataset.
