import { Pin } from '@assetmapping/shared-types';
import { desc } from 'drizzle-orm';
import { useMemo, useRef } from 'react';

import * as schema from '~/db/schema';
import { mapPinDbToPin } from '~/db/utils';
import { useLocalQuery } from '~/hooks/useLocalQuery';
import { db } from '~/services/drizzleDb';

export const useFetchLocalPins = (): Pin[] => {
  // Stable fetch order. The home screen filters by the village dropdown and sorts by name.
  const query = db.select().from(schema.pins).orderBy(desc(schema.pins.updatedAt));
  const result = useLocalQuery(query, 'pins') ?? { data: [] };
  const cache = useRef(new WeakMap<object, Pin>()).current;
  return useMemo(
    () =>
      (result.data ?? []).map((row) => {
        const existing = cache.get(row);
        if (existing) return existing;
        const pin = mapPinDbToPin(row);
        cache.set(row, pin);
        return pin;
      }),
    [result.data, cache]
  );
};
