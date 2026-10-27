import { createForm as saveForm } from '~/features/forms/services/FormService';
import { createPin as savePin } from '~/features/pins/services/PinService';

export const createPin = (
  values: Pick<Parameters<typeof savePin>[0], 'id' | 'name' | 'lat' | 'lng'>
) => savePin({ address: '', cityVillage: '', description: '', type: '', images: [], ...values });

export const createForm = (
  values: Pick<Parameters<typeof saveForm>[0], 'pinId' | 'name' | 'villageId' | 'village'> &
    Partial<Parameters<typeof saveForm>[0]>
) => saveForm(values as Parameters<typeof saveForm>[0]);

/** Existing collection API contract; no durable receipt cache or atomic CAS is modeled. */
export function createCurrentServer() {
  const pins = new Map<string, Record<string, unknown>>();
  const forms = new Map<string, Record<string, unknown>>();
  const read = (records: typeof pins, id: string) =>
    records.has(id)
      ? { success: true as const, data: records.get(id)! }
      : { success: false as const, error: 'HTTP 404: Record not found' };
  const commit = (request: import('@assetmapping/shared-types').SyncItemRequest) => {
    const records = request.entityType === 'pin' ? pins : forms;
    const id = String(request.payload.id);
    const existing = records.get(id);
    if (request.operation === 'create' && existing)
      return { success: false as const, error: 'HTTP 409: Record already exists' };
    if (request.operation !== 'create' && !existing)
      return { success: false as const, error: 'HTTP 404: Record not found' };
    const data =
      request.operation === 'delete'
        ? { id, deleted: true }
        : {
            ...request.payload,
            version: request.operation === 'create' ? 1 : Number(existing?.version) + 1,
          };
    if (request.operation === 'delete') {
      records.delete(id);
      if (request.entityType === 'pin')
        for (const [formId, form] of forms) if (form.pinId === id) forms.delete(formId);
    } else records.set(id, data);
    return {
      success: true as const,
      data: data as import('@assetmapping/shared-types').SyncResult,
    };
  };
  return {
    pins,
    clear: () => {
      pins.clear();
      forms.clear();
    },
    fetchPin: async (id: string) =>
      read(pins, id) as import('@assetmapping/shared-types').ApiResponse<
        import('@assetmapping/shared-types').Pin
      >,
    fetchForm: async (id: string) =>
      read(forms, id) as import('@assetmapping/shared-types').ApiResponse<
        import('@assetmapping/shared-types').Form
      >,
    commit,
    sync: async (request: import('@assetmapping/shared-types').SyncItemRequest) => commit(request),
  };
}
