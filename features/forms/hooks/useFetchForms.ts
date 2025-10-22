import * as schema from '~/db/schema';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '~/services/drizzleDb';
import { eq, and, isNull } from 'drizzle-orm';

export const useFetchForms = (pinId: string) => {
  // Filter out soft-deleted forms
  const query = db
    .select()
    .from(schema.forms)
    .where(and(eq(schema.forms.pinId, pinId), isNull(schema.forms.deletedAt)));
  const result = useLiveQuery(query) ?? [];
  return { data: result };
};
