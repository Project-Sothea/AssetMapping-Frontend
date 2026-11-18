import type { Pin } from '@assetmapping/shared-types';
import { desc } from 'drizzle-orm';

import * as schema from '~/db/schema';
import { mapPinDbToPin } from '~/db/utils';
import { useDatabaseQuery } from '~/hooks/RealTimeSync/useDatabaseQuery';
import { db } from '~/services/drizzleDb';

export const useFetchLocalPins = (): Pin[] =>
  useDatabaseQuery(
    () =>
      db.select().from(schema.pins).orderBy(desc(schema.pins.updatedAt)).all().map(mapPinDbToPin),
    ['pins']
  ).data;
