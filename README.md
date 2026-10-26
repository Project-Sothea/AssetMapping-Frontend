# Asset Mapping Frontend

### Last Updated: 15 Oct, 2026

## Overview

This is the frontend for the asset mapping system, built as a React Native (Expo) mobile app. It is designed to be used in conjunction with the backend.  
The app is written in TypeScript using React Native and Expo Router. It uses local SQLite for offline-first storage and explicit manual REST transfers. WebSockets track connection status only; receiving a notification or reconnecting does not transfer records. The app integrates Mapbox for map rendering and offline map pack downloads.

## Manual Data Transfer

- Saving a pin or form stores it and its pending upload together on this device. Saving does not upload.
- In the Download tab, tap **Upload** to send all pending/failed changes. The result lists uploaded, failed, blocked, and remaining changes. A single form save can queue both a pin and a form, so these are change counts, not patient counts.
- Failed uploads remain on the device. Retry by tapping Upload again. Version conflicts preserve local responses and require team assistance; the app does not silently replace them with server data.
- **Clear Local Data** requires confirmation and is blocked by pending/failed uploads or unsynced records. It removes only this device's records and cached pin images, not backend records, settings, device identity, or offline map packs. Editing a pin's normal Delete action is different: that deletion is sent to the backend when uploaded.
- **Download Latest** is available only with no local pins/forms and no outstanding upload operations. It downloads a complete validated snapshot atomically; partial downloads are not kept.
- Upload, clearing, and download are separate actions. Opening the app, saving the API URL, reconnecting, and changing tabs do not automatically transfer records after setup.
- The header's **No pending uploads** describes the upload queue, not whether the device is an exact mirror of the backend.

### Legacy Data Preservation During Setup

This branch preserves existing local records instead of performing the historical one-time reset. Before migrations, populated older schemas that cannot safely use the current migrations block database setup. Separately, the existing `localDataResetVersion = '1'` marker allows normal setup with pending work; a missing marker plus unsynced records or pending/failed uploads, or an unknown marker value, blocks setup for review. A known marker does not bypass the schema check. Compatible clean records stay on the device without an automatic download; an empty device may download once during initial setup.

Both guards currently block normal app navigation. The saved database and photos remain on the device, but there is no in-app legacy export/conversion/unlock workflow yet. Retry alone cannot resolve an incompatible schema or unknown legacy records. **Keep the app installed and contact the project team; do not clear storage or uninstall to bypass the guard.** A recovery procedure is required before field rollout.

If an empty device's initial download fails, offline collection is still allowed after setup; retry Download Latest while the device remains empty. If the reset marker cannot be persisted, editing remains blocked until setup can safely finish. Manual clearing retains the marker, so future updates do not flush the device again.

### Transfer Tests

Run `npm test -- --runInBand --watchman=false`, `npx tsc --noEmit`, and `npm run lint`. Tests use a separate in-memory SQLite database with the checked-in migrations and mock network/native boundaries; they do not contact production. Native iOS/Android lifecycle and visual smoke tests remain required before release. Use Node.js 20.19.4+ for the installed React Native toolchain.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js 18+](https://nodejs.org/) - JavaScript runtime.
- [Expo CLI](https://docs.expo.dev/get-started/installation/) - `npm install -g expo-cli`
- [Android Studio](https://developer.android.com/studio) or [Xcode](https://developer.apple.com/xcode/) - For running the app on a device or emulator.
- **Java 17 or 21** - Required for Android builds.
- Backend server running (see the backend repository for setup instructions).

## Installation and Setup

1. Clone the repository to your local machine: `git clone <repository-url>`

2. Install dependencies: `npm install`

3. Copy `.env.example` to `.env` and fill in the required values (see below).

4. Run the development server: `npm start`

5. To run on a device or emulator:
   - Android: `npm run android`
   - iOS: `npm run ios`

6. The backend API URL defaults to `EXPO_PUBLIC_API_URL` from your `.env` file. It can also be overridden at runtime via the **Download** tab in the app.

## Configuration

Copy `.env.example` to `.env` and fill in the required values:

| Variable                 | Description                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_MAPBOX_KEY` | Mapbox public token (`pk.*`) — used at runtime to render maps and make API requests |
| `EXPO_PUBLIC_API_URL`    | Default backend API URL (can be overridden in-app)                                  |
| `EAS_PROJECT_ID`         | Your Expo project ID — each developer sets this to their own EAS project            |

The backend API URL defaults to `EXPO_PUBLIC_API_URL` but can be overridden at runtime via the Download tab in the app, where it is persisted locally on device.

### Mapbox Tokens

A single Mapbox public token is required:

- **Public token** (`pk.*`): create or find this in the [Mapbox dashboard](https://account.mapbox.com/access-tokens/). Used by the app at runtime.

### EAS Secrets (for CI/CD builds)

For EAS builds, set these as EAS Secrets rather than committing them to `eas.json`. Run the following for each variable:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_KEY --value <your-value>
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value <your-value>
eas secret:create --scope project --name EAS_PROJECT_ID --value <your-value>
```

EAS will inject these automatically at build time. You do not need `env` blocks in `eas.json`.

---

## Developer Documentation

## Entity Design

The two core data entities are **Pins** and **Forms**.

- **Pin** — a location marker on the map. Represents a health facility or community site. Has a name, coordinates, address, type, and a list of attached images.
- **Form** — a health assessment form linked to a pin. Contains sections for general demographics, health, education, and water.

Each entity has the following sync metadata fields in the local SQLite database:

```
+----+------------+------------+---------+--------+
| id | created_at | updated_at | version | status |
+----+------------+------------+---------+--------+
```

The `version` field is used for optimistic concurrency control during sync. The `status` field tracks the sync state of a record.

Forms belong to pins via a foreign key (`pinId`), with cascade delete.

Full schema: `db/schema.ts`

## Database and Database Schema

The local database is SQLite, accessed via [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/). Queries are written using [Drizzle ORM](https://orm.drizzle.team/) with the `expo` driver. The schema is defined in `db/schema.ts` and migrations are generated into the `drizzle/` folder — these should not be edited by hand.

### Drizzle Configuration (`drizzle.config.ts`)

Key settings:

- **`schema: './db/schema.ts'`** — single source of truth for the SQLite schema.
- **`out: './drizzle'`** — generated migration files are written here.
- **`dialect: 'sqlite'`**, **`driver: 'expo'`** — targets Expo SQLite specifically (required for the Expo environment).

### Workflow

When you change `db/schema.ts`, regenerate and apply migrations:

```bash
npm run db:generate   # Generate a new migration file in drizzle/
npm run db:push       # Apply pending migrations to the local SQLite database
npm run db:studio     # Open Drizzle Studio to browse the local database
```

The generated files in `drizzle/` are committed to source control so that the correct migrations ship with the app.

### DB Utilities (`db/utils.ts`)

Because SQLite has no native array type, multi-value fields are stored as JSON strings. `db/utils.ts` provides `sanitizePinForDb` / `sanitizeFormForDb` (serialise arrays before write) and `mapPinDbToPin` / `mapFormDbToForm` (deserialise arrays after read). These are called in the feature-level services — callers work with plain `string[]` and never handle the JSON encoding directly.

## Sync Architecture

The app uses an offline-first, queue-based sync model:

- All create/update/delete operations are applied locally to SQLite first.
- Each operation is enqueued to the `sync_queue` table with an idempotency key.
- A background sync worker processes the queue, posting operations to the backend API in sequence.
- On startup, the app performs an initial pull to fetch any updates from the server made by other devices.
- A WebSocket connection (`services/websocket/WebSocketManager.ts`) is maintained for real-time updates while the app is in the foreground.

The sync queue entry structure:

```
+----+------------+-----------+-------------+-----------+---------+--------+
| id | created_at | operation | entity_type | entity_id | payload | status |
+----+------------+-----------+-------------+-----------+---------+--------+
```

Key sync files:

- `services/sync/syncService.ts` — one-time legacy setup; no routine automatic transfers
- `services/sync/queue/syncQueue.ts` — explicit upload sessions and retry results
- `services/sync/localDataTransfer.ts` — empty-only downloads and protected local clearing
- `services/sync/transferCoordinator.ts` — transfer exclusion and local-write protection

## Directory Structure

```
.
├── README.md
├── package.json
├── app.json                        - Expo app configuration (name, plugins, permissions).
├── tsconfig.json
├── drizzle.config.ts               - Drizzle ORM configuration for SQLite migrations.
├── babel.config.js
├── metro.config.js
├── eslint.config.js
├── prettier.config.js
├── declaration.d.ts                - Global TypeScript declarations.
├── android/                        - Android native project (generated by Expo).
├── assets/                         - Static assets (icons, splash screen, images).
├── drizzle/                        - Auto-generated Drizzle migration files. Do NOT edit manually.
├── db/
│   ├── schema.ts                   - SQLite schema definitions (pins, forms, sync_queue).
│   └── utils.ts                    - Database utility helpers.
├── app/                            - Expo Router screens.
│   ├── _layout.tsx                 - Root layout; mounts providers and global navigation.
│   ├── (tabs)/
│   │   ├── _layout.tsx             - Tab bar layout.
│   │   ├── index.tsx               - Home / pin list screen.
│   │   ├── map.tsx                 - Map screen.
│   │   └── download.tsx            - Manual data transfer, offline map packs, and API URL configuration.
│   └── pin/[pinId]/
│       └── forms.tsx               - Forms list screen for a specific pin.
├── features/                       - Feature-scoped components, hooks, services, and types.
│   ├── forms/
│   │   ├── components/             - Form UI components (FormEditor, FormModal, section components).
│   │   ├── hooks/                  - React Query mutation/query hooks for forms.
│   │   ├── services/FormService.ts - Local DB operations for forms (CRUD via Drizzle).
│   │   └── types/index.ts          - Form TypeScript types.
│   ├── map/
│   │   └── components/Map.tsx      - Mapbox map component with pin rendering.
│   ├── pins/
│   │   ├── components/             - Pin UI components (PinCard, PinDetails, PinEditor, etc.).
│   │   ├── hooks/                  - React Query mutation/query hooks for pins.
│   │   ├── services/PinService.ts  - Local DB operations for pins (CRUD via Drizzle).
│   │   ├── types/index.ts          - Pin TypeScript types.
│   │   └── utils/convertPinsToCollection.ts - Converts pins to GeoJSON for Mapbox.
│   └── sync/
│       └── components/             - Download tab UI (API URL config, offline packs, device ID).
├── services/                       - App-wide services (not feature-specific).
│   ├── api/
│   │   ├── client.ts               - Axios HTTP client configured with the stored backend URL.
│   │   ├── pinsApi.ts              - REST API calls for pins.
│   │   ├── formsApi.ts             - REST API calls for forms.
│   │   ├── storageApi.ts           - REST API calls for image storage.
│   │   └── syncApi.ts              - REST API calls for sync operations.
│   ├── sync/
│   │   ├── syncService.ts          - One-time legacy setup only; no routine automatic transfers.
│   │   ├── localDataTransfer.ts    - Empty-only snapshot download and protected local clearing.
│   │   ├── transferCoordinator.ts  - Shared transfer exclusion and edit guards.
│   │   ├── syncMetadata.ts         - Manages last-synced timestamps.
│   │   └── queue/
│   │       ├── syncQueue.ts        - Explicit upload sessions and queue metrics.
│   │       ├── syncOperations.ts   - Executes individual sync operations against the API.
│   │       ├── queueOperations.ts  - Low-level queue DB operations.
│   │       └── types.ts            - Sync queue TypeScript types.
│   ├── websocket/
│   │   └── WebSocketManager.ts     - WebSocket connection lifecycle and message handling.
│   ├── images/
│   │   └── ImageManager.ts         - Image upload, download, and local caching.
│   ├── drizzleDb.ts                - Initialises and exports the Drizzle SQLite database instance.
│   ├── apiUrl.ts                   - Persists and retrieves the backend API URL from AsyncStorage.
│   └── mapbox.ts                   - Mapbox initialisation.
├── hooks/
│   ├── OfflinePacks/               - Hooks for creating, deleting, and listing offline map packs.
│   └── RealTimeSync/               - Hooks for WebSocket status and real-time sync state.
├── providers/
│   └── QueryProvider.tsx           - React Query client provider.
└── shared/
    ├── components/
    │   ├── ui/                     - Generic UI primitives (Button, ModalWrapper, Spacer, etc.).
    │   ├── SyncStatusBar.tsx       - Displays current sync queue status.
    │   ├── FallbackImage.tsx       - Image component with offline fallback.
    │   └── ReconnectButton.tsx     - Button to manually trigger WebSocket reconnection.
    ├── contexts/
    │   └── PopupContext.tsx         - Global popup/toast context.
    └── utils/
        ├── errorHandling.ts        - Shared error utilities.
        ├── getDeviceId.ts          - Retrieves or generates a stable device UUID.
        └── parsing.ts              - Data parsing utilities.
```

## Naming and Code Conventions

SQLite Fields: camelCase (Drizzle ORM convention)  
e.g. `pinId`, `createdAt`, `villageId`

TypeScript Types: PascalCase  
e.g. `Pin`, `Form`, `SyncQueueEntry`

API JSON Fields: camelCase  
e.g. `pinId`, `createdAt`

## Miscellaneous Design Choices

### Offline-First with Idempotent Sync

Mutations commit to SQLite and the outbox together, then wait for an explicit manual Upload. A persisted revision key and in-flight journal protect retries and local answers across restarts. The existing server uses a 24-hour Redis retry cache and non-atomic conflict handling; simultaneous edits to one record can still race despite client preflight checks.

### Array Fields as JSON Strings

SQLite does not have a native array type. Multi-value fields (e.g. `images`, `longTermConditions`, `waterSources`) are stored as JSON-serialised strings and deserialised on read. This is handled transparently in the feature-level services.

### Device Identity

Each device generates a stable UUID on first launch (stored in AsyncStorage) via `shared/utils/getDeviceId.ts`. This device ID is attached to sync queue entries so the backend can identify the origin of each operation.

### Image Storage

Pin images are stored locally using Expo's filesystem and synced to the backend via the storage API. `services/images/ImageManager.ts` handles upload, download, and local cache management. Images are referenced by UUID filenames.

## Reliability review and build modes

- Manual Upload/Download remains the app workflow. Saving, reconnecting, notifications and changing the API URL do not start a data transfer. A fresh empty device may perform its one-time setup download; existing records and unknown legacy storage are preserved for review rather than wiped.
- Normal builds default to the existing production API contract (`legacy`). `EXPO_PUBLIC_SYNC_PROTOCOL=durable` is reserved for a coordinated backend rollout. QA builds default to durable unless explicitly built with `legacy`, and allow only the loopback QA API.
- Missing names and household/village IDs remain blank in storage; cards/details display “Not provided”. Existing collection dates are not guessed from identifiers or today. The editor still requires a collection date when saving.
- Local migrations add query indexes and a durable in-flight journal. Populated unknown legacy schemas stop for export/review before historical destructive migrations.
- Upstream manual-transfer exclusion, native file uploads, safe image paths, additional villages and map recovery/zoom constraints are retained. Photo uploads use the native file URI without allocating photo-sized JavaScript buffers.

Reproducible checks (Node 24):

```sh
npm run test:unit
npm test -- --runInBand
npx tsc --noEmit
```

The host suite uses synthetic SQLite/transport fixtures; Jest covers the manual controls, local writes, native upload wrapper and map recovery. Companion backend system tests require the backend checkout beside this repository and its disposable loopback QA services. No test writes to production. Physical-device endurance, low-storage testing and iOS coverage of these combined changes remain incomplete. Keep local-only responses backed up before an app update; do not uninstall or clear storage to resolve an update failure.

### Testing PR #38 before merge

Check out `codex/android-reliability` and record `git rev-parse HEAD` with every test result. The PR can be tested while it is a draft. The October 25 APK and the team's existing TestFlight build do not identify this candidate.

Prerequisites: Node 24, the backend checkout at `../AssetMapping-Backend` for shared types, dependencies installed in both checkouts, and a public Mapbox token configured as `EXPO_PUBLIC_MAPBOX_KEY`. Run `npm ci` and `npm run build:types` in the backend before `npm ci` in the frontend. Native builds also need the existing Mapbox download credential/build configuration. Do not commit `.env` files or credentials.

Use **SO'FORM QA** (`com.anonymous.AssetMapApp.qa`) and a disposable local backend with synthetic records. For compatibility QA, run the existing backend main contract on port 3300 with local PostgreSQL/Redis; backend PR #13 is not required. Configure its `.env` for those disposable services, then use its `npm run migrate` and `PORT=3300 npm run dev`. A freshly migrated database can be populated with synthetic pins/forms through the QA app. Photo integration tests require a separate QA object-storage bucket; do not use the production bucket.

Local Android emulator build:

```sh
EXPO_PUBLIC_APP_ENV=qa EXPO_PUBLIC_SYNC_PROTOCOL=legacy EXPO_PUBLIC_API_URL=http://10.0.2.2:3300 npx expo run:android --variant release
```

Local iOS simulator build (Xcode/CocoaPods required):

```sh
EXPO_PUBLIC_APP_ENV=qa EXPO_PUBLIC_SYNC_PROTOCOL=legacy EXPO_PUBLIC_API_URL=http://127.0.0.1:3300 npx expo run:ios --configuration Release
```

For EAS, `qa-legacy` produces the Android QA APK and `qa-ios` produces an iOS simulator build, both using the existing server contract. For example, `npx eas-cli build --platform ios --profile qa-ios` can be run by a maintainer with project access and the configured build credentials. Install the resulting simulator app on the same Mac running the QA API. `qa-ios` is a simulator build, not an iPhone/TestFlight build. The current QA URL guard permits loopback addresses only; a physical iPhone needs a separately reviewed reachable QA endpoint/build configuration before write testing. Keep this PR unmerged while that device QA is arranged.

For a USB Android handset, run `adb reverse tcp:3300 tcp:3300` and set the QA app's API URL to `http://127.0.0.1:3300`. Avoid uninstalling an app with unsent records. A separate fresh QA install does not prove regular-package upgrade safety; test an update over a prior QA build with matching signing and synthetic pending work too.

Minimum checklist for this candidate:

- Save a form offline with blank name/ID/age plus zero/false answers; force-close/reopen and verify every value.
- Save, reconnect, resume and change API settings: no implicit survey upload. Press Upload explicitly and confirm exact answers/UUIDs on the QA server.
- Upload more than ten operations, interrupt the network, retry, and check pending/failed/blocked totals, parent links and duplicates.
- Pending or failed work prevents clearing/downloading. After successful upload, clearing is local-only and a new empty-device download restores server records.
- Pick a **pin** photo from the gallery, save/reopen/upload and retry after interruption. Survey forms have no photo field; image resizing/caps are not included in this candidate.
- Interrupt a photo-pin upload, delete the pin, restart and retry: prior photos must remain available until the earlier revision and deletion resolve. Also test interrupted child-form uploads followed by parent-pin deletion; the queue must finish after confirmed cascade.
- During an unrelated upload, open a form and use Close/Back; dismissal must work, with a discard prompt for unsaved changes. During that editor's own Save/Delete, keep dismissal and field/photo mutations blocked until its action ends. Try a gallery picker returning after Save starts.
- Repeatedly tap entries/Save/Back/Close, switch Map/Pins, zoom and background/resume. Check the four villages and offline Streets packs inside their downloaded bounds.
- Upgrade with synthetic existing and pending data. Unknown legacy-storage guards must preserve data; if blocked, keep the app installed and report the error. Export/recovery for real legacy phones remains a release gate.

Report source SHA, build profile/package, app build number, OS/device, test steps and expected/actual results. Use synthetic screenshots/logs. Native Android/iOS sign-off remains pending until these exact-build checks are recorded.

The app now has one manual upload worker. Future snapshot reconciliation tools live under `scripts/test-support/` for isolated protocol tests and are not imported by the app. Transfer summaries use SQL aggregates and batched local table notifications, without a two-second polling timer.

Deleted-pin photos are retained while any pin revision remains unresolved. Confirmed deletion retires superseded child recovery entries atomically; local directory cleanup follows acknowledgement. Interrupted cleanup can retry on a later explicit upload. File cleanup errors can leave unused local/remote files and do not invalidate a validated saved-record acknowledgement. Local files from a canceled, never-uploaded pin have no durable cleanup-retry record; storage housekeeping is best effort.
