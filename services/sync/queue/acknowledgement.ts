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
      result.version < (operation === 'create' ? 1 : Number(payload.version))
    )
      throw new Error('The server did not confirm a saved version.');
    if (!sameServerAnswers(payload, result))
      throw new Error(
        'The server confirmed different saved content. Your local answer is preserved for review.'
      );
  }
}

/** Compare saved business answers, allowing only PostgreSQL REAL coordinate precision. */
export function sameServerAnswers(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): boolean {
  return Object.entries(expected).every(([key, value]) => {
    if (['id', 'createdAt', 'updatedAt', 'version', 'status'].includes(key) || value === undefined)
      return true;
    if (
      ['lat', 'lng'].includes(key) &&
      typeof value === 'number' &&
      typeof actual[key] === 'number'
    )
      return Math.abs(value - actual[key]) < 0.00001;
    return JSON.stringify(value) === JSON.stringify(actual[key]);
  });
}
