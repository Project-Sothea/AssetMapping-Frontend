/**
 * Database Utility Functions
 *
 * Helper functions for working with database data, particularly for handling
 * array fields that are stored as JSON strings in SQLite.
 */

/**
 * Convert array fields to JSON strings for SQLite storage.
 * SQLite doesn't support native array types, so we store arrays as JSON strings.
 *
 * @param value - Object with potential array fields
 * @returns Object with arrays converted to JSON strings
 *
 * @example
 * stringifyArrayFields({ tags: ['a', 'b'], name: 'test' })
 * // Returns: { tags: '["a","b"]', name: 'test' }
 */
export function stringifyArrayFields(value: any): typeof value {
  const result = { ...value };
  for (const key in result) {
    if (Array.isArray(result[key])) {
      result[key] = JSON.stringify(result[key]);
    }
  }
  return result;
}

/**
 * Parse JSON string arrays back to arrays when reading from SQLite.
 *
 * @param value - Object with potential JSON string fields
 * @returns Object with JSON strings parsed back to arrays
 *
 * @example
 * parseArrayFields({ tags: '["a","b"]', name: 'test' })
 * // Returns: { tags: ['a', 'b'], name: 'test' }
 */
export function parseArrayFields(value: any): typeof value {
  const result = { ...value };
  for (const key in result) {
    if (typeof result[key] === 'string') {
      try {
        const parsed = JSON.parse(result[key]);
        if (Array.isArray(parsed)) {
          result[key] = parsed;
        }
      } catch {
        // Not a JSON array string, leave as is
      }
    }
  }
  return result;
}

/**
 * Sanitize data for SQLite - remove undefined values and convert Dates
 */
export function sanitizeForDb(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(sanitizeForDb);

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForDb(value);
    }
  }
  return sanitized;
}
