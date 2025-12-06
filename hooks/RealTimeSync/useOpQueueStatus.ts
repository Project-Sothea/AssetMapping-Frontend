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
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { syncQueue } from '~/db/schema';
import { db } from '~/services/drizzleDb';

export const useOpQueueStatus = (entityId: string, entityType: string) => {
  // Query for any pending or failed operations for this entity
  const query = db
    .select()
    .from(syncQueue)
    .where(
      and(
        eq(syncQueue.entityId, entityId),
        eq(syncQueue.entityType, entityType),
        or(eq(syncQueue.status, 'pending'), eq(syncQueue.status, 'failed'))
      )
    );

  const result = useLiveQuery(query);

  // If there are any pending/failed operations, the entity is not synced
  const hasPendingOrFailedOps = (result?.data?.length ?? 0) > 0;

  // Return true if synced (no pending/failed operations), false if unsynced
  return !hasPendingOrFailedOps;
};
