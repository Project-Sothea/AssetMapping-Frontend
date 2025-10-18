import { supabase } from '~/services/supabase';
import { RePin } from '~/utils/globalTypes';
import { convertKeysToSnakeCase } from '~/shared/utils/caseConversion';
import { PIN_ARRAY_FIELDS_SNAKE } from '~/shared/utils/fieldMappings';

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
    const pinsWithSnakeCase = pinsToUpsert.map((pin) =>
      convertKeysToSnakeCase(pin, PIN_ARRAY_FIELDS_SNAKE)
    );

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
    const pinsWithSnakeCase = pinsToUpsert.map((pin) =>
      convertKeysToSnakeCase(pin, PIN_ARRAY_FIELDS_SNAKE)
    );

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
    const pinWithSnakeCase = convertKeysToSnakeCase(pinToUpsert, PIN_ARRAY_FIELDS_SNAKE);

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
