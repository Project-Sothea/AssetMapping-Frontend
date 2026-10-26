import { isLegacySync } from '~/services/sync/protocol';

import type { Operation } from './types';

/** Validate the authoritative record before completing an upload or removing photos. */
export function validateServerAcknowledgement(
  entityId: string,
  operation: Operation,
  payload: Record<string, unknown>,
  result: Record<string, unknown> | undefined
): asserts result is Record<string, unknown> {
  if (
    !result ||
    typeof result.id !== 'string' ||
    result.id.toLowerCase() !== entityId.toLowerCase()
  )
    throw new Error('Invalid server acknowledgement. This change remains saved locally.');
  if (operation === 'delete') {
    if (result.deleted !== true) throw new Error('The server did not confirm deletion.');
  } else {
    if (
      typeof result.version !== 'number' ||
      !Number.isSafeInteger(result.version) ||
      (isLegacySync
        ? result.version < (operation === 'create' ? 1 : Number(payload.version))
        : result.version !== (operation === 'create' ? 1 : Number(payload.version) + 1))
    )
      throw new Error('The server did not confirm a saved version.');
    for (const [key, value] of Object.entries(payload)) {
      if (
        ['id', 'createdAt', 'updatedAt', 'version', 'status'].includes(key) ||
        value === undefined
      )
        continue;
      // Postgres stores legacy map coordinates as REAL (32-bit); compare those
      // within its precision. Survey answers and all other values must match exactly.
      if (
        ['lat', 'lng'].includes(key) &&
        typeof value === 'number' &&
        typeof result[key] === 'number' &&
        Math.abs(value - (result[key] as number)) < 0.00001
      )
        continue;
      if (JSON.stringify(value) !== JSON.stringify(result[key]))
        throw new Error(
          'The server confirmed different saved content. Your local answer is preserved for review.'
        );
    }
  }
}
