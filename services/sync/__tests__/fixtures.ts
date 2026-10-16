import { createForm as saveForm } from '~/features/forms/services/FormService';
import { createPin as savePin } from '~/features/pins/services/PinService';

export const createPin = (
  values: Pick<Parameters<typeof savePin>[0], 'id' | 'name' | 'lat' | 'lng'>
) => savePin({ address: '', cityVillage: '', description: '', type: '', images: [], ...values });

export const createForm = (
  values: Pick<Parameters<typeof saveForm>[0], 'pinId' | 'name' | 'villageId' | 'village'>
) => saveForm(values as Parameters<typeof saveForm>[0]);
