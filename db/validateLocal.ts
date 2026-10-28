import { getTableColumns } from 'drizzle-orm';

import { FORM_ARRAY_FIELDS } from '~/db/formArrayFields';

import { forms, pins } from './schema';

// Validate before SQLite's type affinity can turn invalid input into another value.
export function validateLocal(type: 'form' | 'pin', value: Record<string, unknown>): void {
  const columns = getTableColumns(type === 'form' ? forms : pins);
  const arrays = new Set<string>(type === 'form' ? FORM_ARRAY_FIELDS : ['images']);
  for (const [key, input] of Object.entries(value)) {
    const column = columns[key as keyof typeof columns];
    if (!column) throw new Error(`Unknown saved field: ${key}`);
    if (input === undefined) continue;
    if (arrays.has(key)) {
      if (!Array.isArray(input) || input.some((item) => typeof item !== 'string'))
        throw new Error(`Invalid answer list: ${key}`);
    } else if (input === null) {
      if (column.notNull) throw new Error(`Missing required field: ${key}`);
    } else if (column.dataType === 'date') {
      if (!(input instanceof Date) || !Number.isFinite(input.getTime()))
        throw new Error(`Invalid date: ${key}`);
    } else if (
      typeof input !== column.dataType ||
      (typeof input === 'number' && !Number.isFinite(input))
    )
      throw new Error(`Invalid saved value: ${key}`);
  }
  if (value.age != null && (!Number.isSafeInteger(value.age) || (value.age as number) < 0))
    throw new Error('Age must be a whole number or left blank.');
  if (
    type === 'pin' &&
    (!Number.isFinite(value.lat) ||
      Math.abs(value.lat as number) > 90 ||
      !Number.isFinite(value.lng) ||
      Math.abs(value.lng as number) > 180)
  )
    throw new Error('Invalid map coordinates.');
}
