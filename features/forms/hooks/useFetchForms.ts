import * as schema from '~/db/schema';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '~/services/drizzleDb';
import { eq } from 'drizzle-orm';
import { Form } from '../types';
import { mapFormDbToForm } from '~/db/utils';

export const useFetchForms = (pinId: string): Form[] => {
  const query = db.select().from(schema.forms).where(eq(schema.forms.pinId, pinId));
  // useLiveQuery returns an object like { data, error, isLoading }
  const result = useLiveQuery(query) ?? { data: [] };
  return (result.data ?? []).map(mapFormDbToForm);
};
