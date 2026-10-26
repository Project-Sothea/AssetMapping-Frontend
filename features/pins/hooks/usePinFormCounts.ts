import { count } from 'drizzle-orm';
import { useMemo } from 'react';

import { forms } from '~/db/schema';
import { useLocalQuery } from '~/hooks/useLocalQuery';
import { db } from '~/services/drizzleDb';

export function usePinFormCounts() {
  const { data } = useLocalQuery(
    db.select({ pinId: forms.pinId, count: count() }).from(forms).groupBy(forms.pinId),
    'forms'
  );
  return useMemo(() => new Map(data.map((row) => [row.pinId, row.count])), [data]);
}
