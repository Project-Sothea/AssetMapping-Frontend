import { ReForm } from '~/utils/globalTypes';
import { RemoteRepository } from '../RemoteRepository';
import { callForm } from '~/apis';

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
const ARRAY_FIELDS_CAMEL = [
  'cholesterolAction',
  'coldAction',
  'diabetesAction',
  'hypertensionAction',
  'longTermConditions',
  'managementMethods',
  'mskAction',
  'notUsingWaterFilter',
  'unsafeWater',
  'waterSources',
  'whatDoWhenSick',
];

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

export class SupabaseFormRepo implements RemoteRepository<ReForm> {
  async fetchAll(): Promise<ReForm[]> {
    const forms = await callForm.fetchAll();
    // Convert snake_case from Supabase to camelCase for local SQLite
    return forms.map((form) => convertKeysToCamelCase(form) as ReForm);
  }

  async upsertAll(forms: ReForm[]): Promise<void> {
    if (!forms || forms.length === 0) return;
    await callForm.upsertAll(forms);
    return;
  }

  async updateFieldsBatch(updates: Partial<ReForm>[]): Promise<void> {
    await callForm.updateFieldsBatch(updates);
    return;
  }
}
