import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '~/services/drizzleDb';
import * as schema from '~/db/schema';
import { isNull, eq, and, desc } from 'drizzle-orm';

export const useFetchLocalPins = () => {
  // Filter out soft-deleted pins
  // Order pins by last updated time (most recent first) so activity like form create/update
  // moves the parent pin to the top of the list.
  const query = db
    .select()
    .from(schema.pins)
    .where(isNull(schema.pins.deletedAt))
    .orderBy(desc(schema.pins.updatedAt));
  // useLiveQuery returns an object like { data, error, isLoading }
  const result = useLiveQuery(query) ?? { data: [] };
  return { data: result.data ?? [] };
};

/**
 * Hook to fetch a single pin with live updates
 * This ensures the component re-renders when the pin data changes (e.g., after sync)
 */
export const useFetchLocalPin = (pinId: string) => {
  // Always call the hook, but return empty result if no pinId
  const query = db
    .select()
    .from(schema.pins)
    .where(and(eq(schema.pins.id, pinId), isNull(schema.pins.deletedAt)));

  const result = useLiveQuery(query) ?? { data: [] };
  return { data: result.data?.[0] ?? null };
};
