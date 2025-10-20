/**
 * General Parsing Utilities
 *
 * Provides consistent parsing and validation functions for common data types
 * used throughout the application, reducing code duplication and ensuring
 * uniform handling of JSON strings, arrays, and schema validation.
 */

/**
 * Safely parse JSON string with a fallback value
 * @param jsonString - The JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Parse input that could be a JSON string array, array, or other types into a string array
 * Handles common patterns: string[] | string | null | undefined
 * Only accepts valid JSON arrays; invalid strings are discarded
 * @param input - Input to parse
 * @returns Array of strings
 */
export function parseJsonArray(input: string | string[] | null | undefined): string[] {
  if (!input) return [];

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(input)) {
    return input;
  }

  return [];
}

/**
 * Parse URI input that could be a single URI string, JSON array string, or array
 * More lenient than parseJsonArray - treats non-JSON strings as single URIs
 * @param input - Input to parse
 * @returns Array of strings
 */
export function parseUriInput(input: string | string[] | null | undefined): string[] {
  if (!input) return [];

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If it's a single URI string, wrap in array
      return [input];
    }
  }

  if (Array.isArray(input)) {
    return input;
  }

  return [];
}

/**
 * Convert array fields in an object to JSON strings for storage
 * Recursively handles nested objects
 * @param obj - Object with potential array fields
 * @returns Object with arrays converted to JSON strings
 */
export function stringifyArrayFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return JSON.stringify(obj);

  const result = { ...obj };
  for (const key in result) {
    if (Array.isArray(result[key])) {
      result[key] = JSON.stringify(result[key]);
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = stringifyArrayFields(result[key]);
    }
  }
  return result;
}

/**
 * Parse JSON string fields back to arrays when reading from storage
 * Recursively handles nested objects
 * @param obj - Object with potential JSON string fields
 * @returns Object with JSON strings parsed back to arrays
 */
export function parseArrayFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj;

  const result = { ...obj };
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
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = parseArrayFields(result[key]);
    }
  }
  return result;
}

/**
 * Safely parse a value that might be a JSON string or the value itself
 * @param value - Value to parse
 * @param fallback - Fallback if parsing fails
 * @returns Parsed value or original value or fallback
 */
export function safeParseValue<T>(value: any, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value ?? fallback;
}
