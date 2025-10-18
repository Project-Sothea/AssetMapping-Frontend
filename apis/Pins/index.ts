import { supabase } from '~/services/supabase';
import { RePin } from '~/utils/globalTypes';

/**
 * Convert camelCase keys to snake_case for Supabase
 * Local SQLite uses camelCase, Supabase uses snake_case
 */
const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * Array field names that need to be parsed from JSON strings to arrays
 * SQLite stores arrays as JSON strings, PostgreSQL expects actual arrays
 */
const ARRAY_FIELDS = ['images'];

const convertKeysToSnakeCase = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);

    // Parse JSON strings to arrays for PostgreSQL array fields
    if (ARRAY_FIELDS.includes(snakeKey) && typeof value === 'string') {
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

export const fetchAll = async () => {
  try {
    const { data, error } = await supabase.from('pins').select('*');
    if (error) {
      console.error('supabase error:', error.message);
      return [];
    }
    return data;
  } catch (err) {
    console.error('Non-Supabase Error:', err);
    return [];
  }
};

export const upsertAll = async (pins: RePin[]) => {
  try {
    // Strip out local-only fields before upserting
    const pinsToUpsert = pins.map(
      ({ last_synced_at, last_failed_sync_at, status, failure_reason, local_images, ...rest }) => ({
        ...rest,
        updated_at: rest.updated_at ?? new Date().toISOString(),
      })
    );

    // Convert camelCase to snake_case for Supabase
    const pinsWithSnakeCase = pinsToUpsert.map(convertKeysToSnakeCase);

    const { error } = await supabase.from('pins').upsert(pinsWithSnakeCase, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert pins:', e);
    throw new Error('Error in upserting to remote DB');
  }
};

export const updateFieldsBatch = async (pins: Partial<RePin>[]) => {
  try {
    // Strip out local-only fields before upserting
    const pinsToUpsert = pins.map(
      ({ last_synced_at, last_failed_sync_at, status, failure_reason, local_images, ...rest }) => ({
        ...rest,
        updated_at: rest.updated_at ?? new Date().toISOString(),
      })
    );

    // Convert camelCase to snake_case for Supabase
    const pinsWithSnakeCase = pinsToUpsert.map(convertKeysToSnakeCase);

    const { error } = await supabase.from('pins').upsert(pinsWithSnakeCase, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert fields of pins:', e);
    throw new Error('Error in upserting to remote DB');
  }
};

/**
 * Upsert a single pin to Supabase
 * Used by queue system for individual sync operations
 */
export const upsertOne = async (pin: RePin) => {
  try {
    // Strip out local-only fields before upserting
    const { last_synced_at, last_failed_sync_at, status, failure_reason, local_images, ...rest } =
      pin;

    const pinToUpsert = {
      ...rest,
      updated_at: rest.updated_at ?? new Date().toISOString(),
    };

    // Convert camelCase to snake_case for Supabase
    const pinWithSnakeCase = convertKeysToSnakeCase(pinToUpsert);

    const { error } = await supabase.from('pins').upsert(pinWithSnakeCase, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert pin:', e);
    throw new Error('Error upserting pin to remote DB');
  }
};

/**
 * Soft delete a pin from Supabase
 * Sets deleted_at timestamp instead of removing the record
 * Used by queue system for delete operations
 */
export const deletePin = async (pinId: string) => {
  try {
    const { error } = await supabase
      .from('pins')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pinId);

    if (error) throw error;
  } catch (e) {
    console.error('Failed to soft delete pin:', e);
    throw new Error('Error soft deleting pin from remote DB');
  }
};
