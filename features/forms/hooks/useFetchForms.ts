import { eq } from 'drizzle-orm';

import { forms } from '~/db/schema';
import { useLocalQuery } from '~/hooks/useLocalQuery';
import { db } from '~/services/drizzleDb';

import type { FormSummary } from '../types';

// Cards need metadata, not all 86 columns and 22 decoded selection arrays.
export const useFetchForms = (pinId: string): FormSummary[] => {
  const query = db
    .select({
      id: forms.id,
      pinId: forms.pinId,
      name: forms.name,
      village: forms.village,
      createdAt: forms.createdAt,
      updatedAt: forms.updatedAt,
      version: forms.version,
      status: forms.status,
    })
    .from(forms)
    .where(eq(forms.pinId, pinId));
  return useLocalQuery(query, 'forms', [pinId]).data;
};
