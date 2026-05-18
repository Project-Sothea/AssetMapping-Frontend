# Asset Mapping Frontend

### Last Updated: 12 Apr, 2026

## Overview

This is the frontend for the asset mapping system, built as a React Native (Expo) mobile app. It is designed to be used in conjunction with the backend.  
The app is written in TypeScript using React Native and Expo Router. It uses a local SQLite database for offline-first storage, syncing data to the backend over a REST API and WebSocket connection. The app integrates Mapbox for map rendering and offline map pack downloads.

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

- `services/sync/syncService.ts` — orchestrates the full sync lifecycle
- `services/sync/queue/syncQueue.ts` — queue management
- `services/sync/pullUpdates.ts` — pulls latest state from the backend

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
│   │   └── download.tsx            - Offline map packs and API URL configuration.
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
│   │   ├── syncService.ts          - Orchestrates initial pull and background sync.
│   │   ├── pullUpdates.ts          - Fetches and applies remote updates locally.
│   │   ├── syncMetadata.ts         - Manages last-synced timestamps.
│   │   └── queue/
│   │       ├── syncQueue.ts        - Enqueue/dequeue sync operations.
│   │       ├── syncOperations.ts   - Executes individual sync operations against the API.
│   │       ├── queueOperations.ts  - Low-level queue DB operations.
│   │       ├── queueState.ts       - In-memory queue state management.
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

All mutations go to local SQLite first, then are enqueued for background sync. Each sync queue entry has an `idempotencyKey` so that retried operations are safe to re-submit to the backend without creating duplicates. This ensures correctness under poor network conditions and app restarts.

### Array Fields as JSON Strings

SQLite does not have a native array type. Multi-value fields (e.g. `images`, `longTermConditions`, `waterSources`) are stored as JSON-serialised strings and deserialised on read. This is handled transparently in the feature-level services.

### Device Identity

Each device generates a stable UUID on first launch (stored in AsyncStorage) via `shared/utils/getDeviceId.ts`. This device ID is attached to sync queue entries so the backend can identify the origin of each operation.

### Image Storage

Pin images are stored locally using Expo's filesystem and synced to the backend via the storage API. `services/images/ImageManager.ts` handles upload, download, and local cache management. Images are referenced by UUID filenames.
