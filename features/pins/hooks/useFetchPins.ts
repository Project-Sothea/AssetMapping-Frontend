import { Pin } from '@assetmapping/shared-types';
import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import * as schema from '~/db/schema';
import { mapPinDbToPin } from '~/db/utils';
import { db } from '~/services/drizzleDb';

export const useFetchLocalPins = (): Pin[] => {
  // Order pins by last updated time (most recent first) so activity like form create/update
  // moves the parent pin to the top of the list.
  const query = db.select().from(schema.pins).orderBy(desc(schema.pins.updatedAt));
  // useLiveQuery returns an object like { data, error, isLoading }
  const result = useLiveQuery(query) ?? { data: [] };
  return (result?.data ?? []).map(mapPinDbToPin);
};
