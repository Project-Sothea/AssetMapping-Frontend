export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
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

// Must return the updated object:
export function jsonifyImages(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(jsonifyImages); // recursively handle array items
  }

  if (obj && typeof obj === 'object' && 'images' in obj) {
    return {
      ...obj,
      images: JSON.stringify(obj.images ?? []),
    };
  }

  return obj;
}
