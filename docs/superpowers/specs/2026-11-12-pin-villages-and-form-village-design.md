# Pin-owned Village: Full Migration Design

Updated 18 November 2026. Supersedes the earlier compatibility/copy-on-save proposal.

## Approved behavior

- `pins.cityVillage` is the sole stored village. A form derives its village from its parent through `forms.pinId`; changing the pin changes the displayed village for all linked forms.
- Remove `forms.village` and `forms.otherVillage` from PostgreSQL, device SQLite, shared types, form input, validation, and write payloads. Do not copy village values into form records.
- Keep `forms.villageId`: existing values are household codes, not village names.
- Require a dropdown choice for every new pin: Krang Svat, Srae Ou, Svay Sor, Boeung Tim, Test Village.
- Preserve the 13 existing blank-village pins without assigning a guessed village. Editing an unrelated field must preserve an existing blank. A user may select a village when needed. New forms require a parent pin with a village.
- Remove Address from pin creation, editing, and details UI. Preserve its existing storage column: deleting Address data is separate from removing redundant form-village storage.
- Operate on the cleaned migration-test dataset. Do not migrate or replace the original production database or switch production traffic.

## Evidence and preconditions

The 18 November test API audit found 208 pins, 268 forms, no missing parent pins, no form/pin village conflicts, no populated otherVillage answers, and no forms attached to the 13 blank-village pins. Production has 144 village differences and is not suitable for this destructive schema migration without reconciliation.

The user reports no pending uploads and no traffic and chose full removal rather than older-client compatibility. Recheck the target dataset before applying DDL and back it up. Abort on a conflicting form village, populated otherVillage, orphan, unexpected schema, or unreviewed target change.

## Approaches

1. Full removal on test (chosen by user): normalize storage and deploy the new app/backend together. Older app versions cannot be used with the migrated API.
2. Staged compatibility: retain redundant columns while apps update. Previously recommended; user explicitly declined because there are no pending uploads or traffic.
3. Copy pin village on form save: rejected because it leaves duplicated state and stale values after pin edits.

## Upgrade and rollout

Target an in-place app update, preserving application identity and signing. Append forward migrations; never modify historical migrations or increment the legacy reset marker. Check the supported SQLite migration path, transaction rollback, foreign-key cascade, retained survey data, and queued operations. Preserve pending work if unexpectedly encountered.

Schema upgrade and dataset refresh are separate. Existing devices can retain old production IDs after a schema migration. For devices still caching the conflicting production dataset, verify no unsent work and use Clear Local Data in the OLD app BEFORE installing the update. Then update in place, verify the test API URL, and Download Latest to load the cleaned dataset; keep offline map packs. Do not direct users to a Clear action behind the migration gate if a migration has already failed. Devices with compatible local data can follow the tested nonempty upgrade path. Saved API URLs override the build default, so explicitly verify the selected endpoint. Reinstall is not the planned recovery path. Actual device upgrade validation is required before guaranteeing update behavior. Backend rollback does not downgrade device SQLite automatically; do not reinstall an old binary over the new schema without a separately verified schema restore or preserved-data reset.

## Implementation and verification boundaries

Use a joined/read-derived village for UI where needed, with no writable derived field in storage or upload payloads. Keep pin and form identity, timestamps, and all survey answers unchanged by schema migration. Do not opportunistically fix D3/G3 naming or unresolved source-sheet mappings.

Verify fresh install and upgrade from the current schema, including legacy conflicting rows (the device migration archives independent values outside active forms, while the server migration refuses conflicts), FK integrity, failure rollback/retry, offline edit/upload/download, inherited village after a pin edit, required new-pin selection, existing blank pins, and no form village question. Run frontend tests/type/lint and backend build/lint plus PostgreSQL migration checks on a disposable restore before the actual test target.

## Remote execution

Deploy the pinned backend feature commit to migration-test with a guarded pre-deploy migration using its existing database connection. The wrapper checks the exact host/environment/service, full audited dataset fingerprint, and transactional preservation. It creates a durable full backup schema before changing active storage. Production is rejected.
