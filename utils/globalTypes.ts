/**
 * Global Type Re-exports
 *
 * @deprecated This file will be removed in the future.
 * Import types directly from their source locations:
 * - Database types: import from '~/db/types'
 * - Offline pack types: import from '~/hooks/OfflinePacks/types'
 *
 * For backward compatibility, database types are still re-exported here.
 */

// Re-export database types for backward compatibility
export type {
  Pin,
  Form,
  SyncQueueItem,
  RePin,
  ReForm,
  LocalPin,
  LocalForm,
  RemotePin,
  RemoteForm,
  InsertPin,
  InsertForm,
  InsertSyncQueueItem,
  InsertRemotePin,
  InsertRemoteForm,
} from '~/db/types';
