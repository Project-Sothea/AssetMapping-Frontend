import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import * as schema from '~/db/schema';
import { mapFormDbToForm } from '~/db/utils';
import { db } from '~/services/drizzleDb';

import { Form } from '../types';

export const useFetchForms = (pinId: string): Form[] => {
  const query = db.select().from(schema.forms).where(eq(schema.forms.pinId, pinId));
  // useLiveQuery returns an object like { data, error, isLoading }
  const result = useLiveQuery(query) ?? { data: [] };
  return (result.data ?? []).map(mapFormDbToForm);
};
