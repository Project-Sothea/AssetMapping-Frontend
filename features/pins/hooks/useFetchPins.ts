import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '~/services/drizzleDb';
import * as schema from '~/db/schema';
import { eq, desc } from 'drizzle-orm';
import { mapPinDbToPin } from '~/db/utils';

export const useFetchLocalPins = () => {
  // Order pins by last updated time (most recent first) so activity like form create/update
  // moves the parent pin to the top of the list.
  const query = db.select().from(schema.pins).orderBy(desc(schema.pins.updatedAt));
  // useLiveQuery returns an object like { data, error, isLoading }
  const result = useLiveQuery(query) ?? { data: [] };
  return { data: (result.data ?? []).map((pin) => mapPinDbToPin(pin)) };
};

/**
 * Hook to fetch a single pin with live updates
 * This ensures the component re-renders when the pin data changes (e.g., after sync)
 */
export const useFetchLocalPin = (pinId: string) => {
  // Always call the hook, but return empty result if no pinId
  const query = db.select().from(schema.pins).where(eq(schema.pins.id, pinId));

  const result = useLiveQuery(query) ?? { data: [] };
  return { data: result.data?.[0] ? mapPinDbToPin(result.data[0]) : null };
};
