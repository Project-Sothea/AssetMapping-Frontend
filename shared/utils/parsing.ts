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
