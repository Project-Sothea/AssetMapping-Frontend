import type { Form } from '@assetmapping/shared-types';
import { eq } from 'drizzle-orm';

import * as schema from '~/db/schema';
import { mapFormDbToForm } from '~/db/utils';
import { useDatabaseQuery } from '~/hooks/RealTimeSync/useDatabaseQuery';
import { db } from '~/services/drizzleDb';

export type FormWithVillage = Form & { pinVillage: string | null };

export const useFetchForms = (pinId: string): FormWithVillage[] =>
  useDatabaseQuery(
    () =>
      db
        .select({ form: schema.forms, pinVillage: schema.pins.cityVillage })
        .from(schema.forms)
        .innerJoin(schema.pins, eq(schema.forms.pinId, schema.pins.id))
        .where(eq(schema.forms.pinId, pinId))
        .all()
        .map(({ form, pinVillage }) => ({ ...mapFormDbToForm(form), pinVillage })),
    ['forms', 'pins'],
    pinId
  ).data;
