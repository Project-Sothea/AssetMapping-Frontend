import { RePin } from '~/utils/globalTypes';
import { RemoteRepository } from '../RemoteRepository';
import { callPin } from '~/apis';

/**
 * Convert snake_case keys to camelCase for local SQLite
 * Supabase uses snake_case, local SQLite uses camelCase
 */
const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Array field names (in camelCase) that need to be stringified for SQLite
 * PostgreSQL returns arrays, SQLite stores them as JSON strings
 */
const ARRAY_FIELDS_CAMEL = ['images'];

const convertKeysToCamelCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    // Stringify arrays to JSON for SQLite storage
    if (ARRAY_FIELDS_CAMEL.includes(camelKey) && Array.isArray(value)) {
      result[camelKey] = JSON.stringify(value);
    } else {
      result[camelKey] = value;
    }
  }
  return result;
};

export class SupabasePinRepo implements RemoteRepository<RePin> {
  async fetchAll(): Promise<RePin[]> {
    const pins = await callPin.fetchAll();
    // Convert snake_case from Supabase to camelCase for local SQLite
    return pins.map((pin) => convertKeysToCamelCase(pin) as RePin);
  }

  async upsertAll(pins: RePin[]): Promise<void> {
    if (!pins || pins.length === 0) return;
    try {
      await callPin.upsertAll(pins);
    } catch {
      console.error('supabasePinReo UpsertAll Error');
    }
    return;
  }

  async updateFieldsBatch(updates: Partial<RePin>[]): Promise<void> {
    await callPin.updateFieldsBatch(updates);
    return;
  }
}
