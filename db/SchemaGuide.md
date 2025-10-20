# Database Schema Documentation

This directory contains the database schema definitions for the AssetMapping app, using Drizzle ORM for both local SQLite and remote PostgreSQL (Supabase) databases.

## Sync Queue Table (`sync_queue`)

The `sync_queue` table is a local SQLite-only table that manages background sync operations for offline-first functionality. It queues CRUD operations (create, update, delete) on pins and forms when the app is offline, then processes them when connectivity is restored.

### Schema Fields

| Field            | Type                          | Description                                                                                         |
| ---------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `id`             | TEXT (Primary Key)            | Unique identifier for the queued operation.                                                         |
| `createdAt`      | TEXT                          | Timestamp when the operation was queued (ISO string).                                               |
| `operation`      | TEXT (Not Null)               | The CRUD operation: `'create'`, `'update'`, or `'delete'`.                                          |
| `entityType`     | TEXT (Not Null)               | The entity type: `'pin'` or `'form'`.                                                               |
| `entityId`       | TEXT (Not Null)               | The ID of the pin or form being operated on.                                                        |
| `idempotencyKey` | TEXT (Not Null, Unique)       | Prevents duplicate operations (format: `{entityType}-{entityId}-{timestamp}`).                      |
| `payload`        | TEXT (Not Null)               | JSON string of the full entity data to sync (e.g., pin or form object). A Snapshot.                 |
| `status`         | TEXT (Not Null)               | Operation state: `'pending'`, `'completed'`, or `'failed'`. Used to track status of each operation. |
| `attempts`       | INTEGER (Not Null, Default 0) | Number of retry attempts made.                                                                      |
| `maxAttempts`    | INTEGER (Not Null, Default 3) | Maximum allowed retry attempts.                                                                     |
| `lastError`      | TEXT                          | Error message from the last failed attempt.                                                         |
| `lastAttemptAt`  | TEXT                          | Timestamp of the last attempt (ISO string).                                                         |
| `sequenceNumber` | INTEGER                       | Timestamp for FIFO ordering (set to `Date.now()`).                                                  |
| `dependsOn`      | TEXT                          | Reserved for operation dependencies (not currently used).                                           |
| `deviceId`       | TEXT                          | Identifier for the device that queued the operation.                                                |

### Usage

- **Queuing**: Operations are enqueued via `enqueuePin()` or `enqueueForm()` when offline.
- **Processing**: `processQueue()` handles pending operations in sequence order when online.
- **Retries**: Failed operations are retried up to `maxAttempts` if the error is retriable (network/timeout issues).
- **Cleanup**: Completed operations can be cleared with `cleanupOld()`.

This table ensures reliable offline sync without data loss.

## Other Important Fields:

1. version (Pin, Form): for optimistic concurrency control - used to deconflict in the backend

2. status (Pin, Form): Legacy usage (to be removed from schema and no longer updated)

3. status (Sync_queue): Used to track the sync status of each entity
