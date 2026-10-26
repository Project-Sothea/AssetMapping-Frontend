import type { Form, Pin } from '@assetmapping/shared-types';

import { fetchForm } from '~/services/api/formsApi';
import { fetchPin } from '~/services/api/pinsApi';

import type { EntityType, Operation } from './queue/types';

// A best-effort check for the existing server. The server still lacks an atomic
// compare-and-write, so another phone can change a row after this check.
export async function checkLegacyUpload(
  type: EntityType,
  operation: Operation,
  payload: Record<string, unknown>
): Promise<Record<string, unknown> | undefined> {
  const response = await (type === 'pin' ? fetchPin : fetchForm)(String(payload.id));
  if (!response.success) {
    if (!/^HTTP 404\b/.test(response.error ?? ''))
      throw new Error(response.error || 'Unable to check the current server record.');
    if (operation === 'create') return;
    if (operation === 'delete') return { id: payload.id, deleted: true };
    throw new Error('This record was deleted on the server. Your local answer needs review.');
  }
  const remote = response.data as Pin | Form;
  if (
    !remote ||
    remote.id !== payload.id ||
    !Number.isSafeInteger(remote.version) ||
    remote.version < 1
  )
    throw new Error('Invalid server record. Your saved local data needs review.');
  if (operation !== 'delete' && sameLegacyAnswers(payload, remote)) return remote;
  if (operation === 'create')
    throw new Error(
      'This UUID already has different server answers. Your local answer needs review.'
    );
  if (remote.version !== payload.version)
    throw new Error('The server record changed on another device. Your local answer needs review.');
}

export function sameLegacyAnswers(
  payload: Record<string, unknown>,
  remote: Record<string, unknown>
): boolean {
  return Object.entries(payload).every(([key, value]) => {
    if (['id', 'version', 'status', 'createdAt', 'updatedAt'].includes(key) || value === undefined)
      return true;
    if (
      ['lat', 'lng'].includes(key) &&
      typeof value === 'number' &&
      typeof remote[key] === 'number'
    )
      return Math.abs(value - remote[key]) < 0.00001;
    return JSON.stringify(value) === JSON.stringify(remote[key]);
  });
}
