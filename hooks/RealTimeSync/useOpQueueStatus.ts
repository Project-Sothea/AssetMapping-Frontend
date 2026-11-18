/**
 * useOpQueueStatus Hook
 *
 * General live query hook that checks the sync queue for pending or failed operations
 * for any entity type. Used to determine if an entity should show as synced or unsynced.
 *
 * Returns true if the entity has no pending/failed operations (synced),
 * false if there are pending/failed operations (unsynced).
 */

import { eq, and, or } from 'drizzle-orm';

import { syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

import { useDatabaseQuery } from './useDatabaseQuery';

export const useOpQueueStatus = (entityId: string, entityType: string) => {
  const result = useDatabaseQuery(
    () =>
      db
        .select({ id: syncQueue.id })
        .from(syncQueue)
        .where(
          and(
            eq(syncQueue.entityId, entityId),
            eq(syncQueue.entityType, entityType),
            or(eq(syncQueue.status, 'pending'), eq(syncQueue.status, 'failed'))
          )
        )
        .all(),
    ['sync_queue'],
    JSON.stringify([entityType, entityId])
  );
  return result.data.length === 0;
};
