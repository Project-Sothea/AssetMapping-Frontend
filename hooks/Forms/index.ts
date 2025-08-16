import * as schema from '~/db/schema';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '~/services/drizzleDb';
import { eq } from 'drizzle-orm';

export const useFetchLocalForms = (pinId: string) => {
  const query = db.select().from(schema.forms).where(eq(schema.forms.pinId, pinId));
  return useLiveQuery(query) ?? [];
};
