import { and, eq, inArray } from 'drizzle-orm';
import { useMemo } from 'react';

import { syncQueue } from '~/db/schema';
import { useLocalQuery } from '~/hooks/useLocalQuery';
import { db } from '~/services/drizzleDb';

export function usePendingEntityIds(entityType: 'pin' | 'form') {
  const { data } = useLocalQuery(
    db
      .select({ id: syncQueue.entityId })
      .from(syncQueue)
      .where(
        and(eq(syncQueue.entityType, entityType), inArray(syncQueue.status, ['pending', 'failed']))
      ),
    'sync_queue',
    [entityType]
  );
  return useMemo(() => new Set(data.map((row) => row.id)), [data]);
}
