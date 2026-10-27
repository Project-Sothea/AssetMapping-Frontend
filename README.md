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

This branch preserves existing local records instead of performing the historical one-time reset. Before migrations, populated older schemas that cannot safely use the current migrations block database setup. A missing historical setup marker does not block compatible databases: records, pending/failed uploads and recovery journals remain intact, the marker is recorded, and the app opens. No existing records are automatically enqueued or uploaded. Initial download runs only when pins, forms, queue and recovery journal are all empty.

The existing `localDataResetVersion = '1'` marker remains supported, including ordinary pending work. Unknown non-null marker values still block setup rather than silently downgrade another app version. A known marker does not bypass the schema check. For incompatible schemas or unknown setup versions, normal navigation remains blocked and the saved database/photos remain on the device. There is no in-app conversion/export/unlock workflow for those unsupported cases. **Keep the app installed and contact the project team; do not clear storage or uninstall to bypass the guard.** Recovery for affected older installations is required before rollout to those phones.

If an empty device's initial download fails, offline collection is still allowed after setup; retry Download Latest while the device remains empty. If the reset marker cannot be persisted, editing remains blocked until setup can safely finish. Manual clearing retains the marker, so future updates do not flush the device again.

Upload validates individual queued changes against saved answers before starting a new request. Invalid or mismatched changes stay unresolved while unrelated valid changes can upload. Local SQLite migration `0006_queue_write_origin` adds a nullable queue field recording new atomic writes; existing rows are not backfilled as trusted. An old queued deletion without that evidence or a matching recovery journal is held instead of being sent automatically. Unsynced records with no queue entry remain local; opening the app does not invent upload operations for them. These errors do not open a review wizard or lock normal navigation.

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

## Reliability and testing

The app keeps the existing manual Upload/Download workflow and backend contract. There is one regular SO'FORM package. This future-work branch adds an explicit protocol switch; it does not add a QA app variant.

- Saving, reconnecting, notifications and changing the API URL do not upload survey responses. Empty-device setup may download once.
- Blank names and household/village IDs stay blank; cards/details display “Not provided”. Existing collection dates are not guessed.
- Local query indexes, upload recovery journals and queue-origin metadata preserve responsive reads and interrupted uploads. Unsupported populated older schemas stop before destructive historical migrations.
- Photo bytes stay on the device while a related upload/deletion is unresolved. Cleanup is best effort and can leave unused files; housekeeping errors do not invalidate a confirmed upload.
- Current-server checks cannot eliminate its concurrent-write race. Backend PR #13 and its future-protocol experiments are separate work.

Run the current-app regression suites with Node 24:

```sh
npm run test:unit
npm test -- --runInBand
npx tsc --noEmit
```

These tests use synthetic SQLite/network/native fixtures. This future-work branch also retains isolated snapshot/reconciliation experiments; they are not used by the manual download screen.

### Testing PR #38 before merge

Check out `codex/android-reliability` and record the source SHA. Keep the backend checkout beside the frontend for the existing shared-types dependency: install its dependencies and run `npm run build:types`, then install frontend dependencies. Use the existing Mapbox/build credentials without committing them.

Test the regular app in a disposable emulator/simulator using synthetic records and a dedicated test backend/object bucket. Set `EXPO_PUBLIC_API_URL` before building, then verify the effective URL in Download settings: a previously saved URL overrides that environment variable. Ordinary Android/iOS network security rules apply; use HTTPS where required. This branch has no special QA networking plugin or endpoint restrictions. Do not use production for failure or write tests.

Use the normal `npm run android` / `npm run ios` build commands. Existing APKs labelled SO'FORM QA predate this scope reduction and do not represent the current branch. A fresh install does not prove update safety; test an update over a matching-signed regular build containing synthetic pending work too.

Minimum checks:

- Save offline with blank name/ID/age, zero and false; force-close/reopen and verify every value. Saving, reconnecting and resuming must not upload. Explicit Upload must preserve the UUID, answers and parent link.
- Upload more than ten changes; interrupt/retry and verify totals and duplicates. Pending/failed/unconfirmed records must prevent Clear/Download. Clearing after successful upload is local-only; downloading into an empty device restores server records.
- Interrupt a pin-photo upload, delete the pin, restart and retry. Keep prior photos until recovery/deletion resolves. Repeat for child-form upload followed by parent deletion.
- Close/Back must work during an unrelated upload, with dirty-discard confirmation. Block dismissal/mutation during that editor's own Save/Delete; test a delayed photo picker.
- Burst-tap entries and Save, use Back/Close, switch Map/Pins, zoom and background/resume. Check the four villages and offline Streets packs.
- Update with existing/pending data and a missing historical setup marker. Preserve answers/outbox/journals without implicit transfers. Hold malformed uploads individually; incompatible schemas and unknown future setup versions still require recovery assistance. Do not uninstall or clear storage to bypass a failure.

Report source SHA, package/build number, OS/device, steps and expected/actual results. Physical-device endurance, low-storage and exact-build Android/iOS sign-off remain pending. Survey forms have no photo field; image resizing/caps are outside this PR.

## Future protocol draft (separate from PR #38)

This branch depends on PR #38 and is not part of its current-server release. `EXPO_PUBLIC_SYNC_PROTOCOL=durable` selects the proposed protocol-2 backend contract; absent configuration continues using the existing contract. Coordinate any rollout with backend PR #13 and compatible Android/iOS clients. This branch retains the future snapshot/reconciliation test helpers and optional `npm run test:perf` benchmark. It does not restore the SO'FORM QA identity, QA profiles, networking plugin or runtime URL guard.

The companion backend draft's durable system checks require this frontend branch beside that backend checkout. Ordinary current-server regression checks belong on PR #38. Neither draft is a deployment instruction.
