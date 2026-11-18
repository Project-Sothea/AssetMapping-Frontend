# Pin-owned Village Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store village only on pins, migrate the cleaned test environment, and support a verified in-place mobile upgrade.

**Architecture:** Keep forms linked by their existing pinId foreign key. Remove redundant stored form village fields; resolve village from the current pin for presentation. Require the shared dropdown for new pins while preserving existing blank landmarks.

**Tech Stack:** Expo/React Native, React Hook Form/Zod, Drizzle SQLite/PostgreSQL, Express, Jest/sql.js.

**Spec:** ../specs/2026-11-12-pin-villages-and-form-village-design.md

## Global Constraints

- Test environment only; production schema/data/traffic stay unchanged.
- Villages: Krang Svat, Srae Ou, Svay Sor, Boeung Tim, Test Village.
- Retain household-code villageId and all survey answers/relationships.
- Existing blank villages remain blank; new pins require a village.
- Preserve pre-existing eas.json edits and all historical migrations/reset markers.
- Remove Address UI; retain Address storage.

## Review Focus

- Installed devices may still contain conflicting production data: archive independent form village values outside active rows; preserve unexpected pending work.
- Old queued payloads may contain removed fields: retain/block unexpected pending work rather than delete it or reuse idempotency keys with changed payloads.
- Dropping/rebuilding SQLite tables must preserve child rows and foreign-key cascade.
- Offline pin village changes must immediately affect displayed form village without rewriting forms.
- Saved API URL can point at production despite a test build; verify the endpoint before clearing/downloading or running SQL.

### Task 1: Storage contract and forward migrations

**Files:** Backend packages/shared-types/src/schema.ts and src/index.ts; new backend drizzle migration/snapshot/journal; frontend db/schema.ts and new drizzle migration/snapshot/journal plus drizzle/migrations.js; frontend services/sync/**tests**/pinVillageMigration.test.ts.

**Interfaces:** Stored Form/FormDB exclude village and otherVillage; villageId remains. Pin.cityVillage stays nullable for legacy landmarks. Read-derived presentation values must not become writes.

- [x] Add and observe failing migration tests: upgrade seeded legacy DB with survey answers; preserve records/FKs/queues; archive populated conflicting village/otherVillage locally; reject conflicts on the server; rollback/retry safely; fresh DB reaches identical schema.
- [x] Generate forward migration metadata using Drizzle; inspect generated SQL. Implement preflight so local old data cannot silently lose independent village values. Keep PostgreSQL target validation distinct from mobile migration requirements.
- [x] Run the migration tests and verify legacy/new schema column lists and foreign_key_check.

### Task 2: Pin dropdown, form presentation, persistence and sync

**Files:** Frontend shared/constants/villages.ts; features/pins/components/PinForm.tsx, VillageDropdown.tsx, PinDetails.tsx, PinEditor.tsx; features/forms/components/GeneralSection.tsx, FormEditor.tsx, FormCard.tsx; features/forms/hooks/useFetchForms.ts; form/pin services; db/utils.ts; sync serializers/tests; backend src/db/utils.ts and pin/form services as required by the final contract.

**Interfaces:** New pins require a shared-list village; existing blank pins retain blank on unrelated edits. New forms require a valid pin with a village. UI derives village by FK lookup/join; DB/upload forms contain no village/otherVillage keys.

- [x] Add and observe failing behavior tests: new pin cannot save blank/invalid dropdown; Test Village saves; blank landmark can be edited; Address UI absent and stored value preserved; form question absent; no form-village validation; current parent village appears after pin update; parent-ID protection retained; blank-parent form creation rejected.
- [x] Implement the minimal shared selection/validation, UI removal, derived reads, write serialization, and backend validation. Preserve legacy household-code/default behavior unrelated to this request.
- [x] Update fixtures and existing tests for the new storage contract; test full offline create/edit/queue/upload/download using the new payload shape.
- [x] Run targeted tests, frontend full Jest/type/lint and backend build/lint. Report unrelated failures explicitly.

### Task 3: Remote preflight and migration-test rollout

**Files:** Add a target-checking migration preflight/verification script and rollout record under backend scripts/ and frontend docs/testing/.

**Interfaces:** Read-only target audit and backup precede transactional SQL. Remote execution must use verified migration-test service/environment identifiers, never production defaults.

- [x] Identify authorized SQL/deploy access, installed test-backend source, and actual DB target; if unavailable, finish local artifacts and state the exact access needed.
- [x] Back up/restore the cleaned dataset into a disposable PostgreSQL database; preflight village consistency and otherVillage emptiness; execute migration and compare nonremoved fields/IDs/counts/FKs, aborting on discrepancies.
- [x] With the app/backend change concrete and checks passing, deploy only the explicitly selected test backend and apply its migration through its established deployment mechanism. Do not modify live production or unrelated pin names.
- [x] Verify live test endpoints, 208/268 baseline or independently audited updated counts, retained answer hashes/IDs/FKs, absent stored redundant fields, and create/edit/download behavior using isolated reversible test records.

### Task 4: Existing-device update verification and handoff

**Files:** frontend docs/testing/2026-11-18-pin-owned-village.md; README.md.

- [x] Exercise upgrade from the current local schema with representative data. Verify failure recovery, no repeat reset, unchanged API settings/offline map packs, and blocked unexpected pending work.
- [ ] Verify clearing the stale production dataset in the OLD app before installing the update, followed by updating in place and downloading from the verified migration-test URL, replaces old IDs with the cleaned snapshot. If a migration gate has already failed, do not prescribe an inaccessible in-app Clear action; provide a tested recovery path.
- [ ] If a device/simulator and installable update are available, validate an actual in-place update with the same bundle/package identity and signing. Otherwise report this as unverified; do not claim users can upgrade without problems based only on unit tests.
- [x] Summarize completed local/remote checks, remaining access/build limits, and rollout instructions. Reinstall is not the default recovery step.
