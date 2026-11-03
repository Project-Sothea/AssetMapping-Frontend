import type { Operation } from './types';
export function mergeOperation(
  previous: Operation,
  next: Operation,
  previouslyAttempted = false
): Operation | null {
  if (previous === 'create')
    return next === 'delete' ? (previouslyAttempted ? 'delete' : null) : 'create';
  return next;
}
