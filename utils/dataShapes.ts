export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function convertKeysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamel);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const camelKey = snakeToCamel(key);
        acc[camelKey] = convertKeysToCamel(value);
        return acc;
      },
      {} as Record<string, any>
    );
  }
  return obj;
}

export function convertKeysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnake);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        const snakeKey = camelToSnake(key);
        acc[snakeKey] = convertKeysToSnake(value);
        return acc;
      },
      {} as Record<string, any>
    );
  }
  return obj;
}

export function stringifyArrayFields(value: any): typeof value {
  const result = { ...value };
  for (const key in result) {
    if (Array.isArray(result[key])) {
      result[key] = JSON.stringify(result[key]);
    }
  }
  return result;
}

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
