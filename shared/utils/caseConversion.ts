/**
 * Shared utilities for converting between camelCase and snake_case
 * 
 * Local SQLite uses camelCase naming convention
 * Remote Supabase PostgreSQL uses snake_case naming convention
 * 
 * These utilities handle bidirectional conversion between the two formats,
 * including special handling for array fields that need JSON serialization.
 */

/**
 * Convert a camelCase string to snake_case
 * @param str - The camelCase string to convert
 * @returns The snake_case version of the string
 * 
 * @example
 * toSnakeCase('createdAt') // 'created_at'
 * toSnakeCase('userId') // 'user_id'
 */
export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Convert a snake_case string to camelCase
 * @param str - The snake_case string to convert
 * @returns The camelCase version of the string
 * 
 * @example
 * toCamelCase('created_at') // 'createdAt'
 * toCamelCase('user_id') // 'userId'
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert all keys in an object from camelCase to snake_case
 * Also handles array field serialization (JSON strings → PostgreSQL arrays)
 * 
 * @param obj - Object with camelCase keys
 * @param arrayFields - Array of snake_case field names that should be parsed from JSON strings to arrays
 * @returns New object with snake_case keys and parsed arrays
 * 
 * @example
 * convertKeysToSnakeCase(
 *   { userId: '123', createdAt: '2024-01-01', images: '["a.jpg","b.jpg"]' },
 *   ['images']
 * )
 * // { user_id: '123', created_at: '2024-01-01', images: ['a.jpg', 'b.jpg'] }
 */
export const convertKeysToSnakeCase = (
  obj: Record<string, any>,
  arrayFields: string[] = []
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);

    // Parse JSON strings to arrays for PostgreSQL array fields
    if (arrayFields.includes(snakeKey) && typeof value === 'string') {
      try {
        result[snakeKey] = JSON.parse(value);
      } catch {
        // If parsing fails, set to empty array
        result[snakeKey] = [];
      }
    } else {
      result[snakeKey] = value;
    }
  }
  
  return result;
};

/**
 * Convert all keys in an object from snake_case to camelCase
 * Also handles array field serialization (PostgreSQL arrays → JSON strings)
 * 
 * @param obj - Object with snake_case keys
 * @param arrayFields - Array of camelCase field names that should be stringified from arrays to JSON
 * @returns New object with camelCase keys and stringified arrays
 * 
 * @example
 * convertKeysToCamelCase(
 *   { user_id: '123', created_at: '2024-01-01', images: ['a.jpg', 'b.jpg'] },
 *   ['images']
 * )
 * // { userId: '123', createdAt: '2024-01-01', images: '["a.jpg","b.jpg"]' }
 */
export const convertKeysToCamelCase = (
  obj: Record<string, any>,
  arrayFields: string[] = []
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    // Stringify arrays to JSON for SQLite storage
    if (arrayFields.includes(camelKey) && Array.isArray(value)) {
      result[camelKey] = JSON.stringify(value);
    } else {
      result[camelKey] = value;
    }
  }
  
  return result;
};
