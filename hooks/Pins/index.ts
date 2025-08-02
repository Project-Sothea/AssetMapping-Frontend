import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '~/services/drizzleDb';
import * as schema from '~/db/schema';

export const useFetchLocalPins = () => {
  const query = db.select().from(schema.pins);
  return useLiveQuery(query) ?? [];
};
