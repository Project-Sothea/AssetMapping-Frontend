import { supabase } from '~/services/supabase';
import { Pin } from '~/utils/globalTypes';

/**
 * Upsert a single pin to Supabase
 * Used by queue system for individual sync operations
 */
export const upsertOne = async (pin: Pin) => {
  try {
    // Strip out local-only fields before upserting
    const { lastSyncedAt, lastFailedSyncAt, status, failureReason, localImages, ...rest } = pin;

    const pinToUpsert = {
      ...rest,
      updatedAt: rest.updatedAt ?? new Date().toISOString(),
    };

    const { error } = await supabase.from('pins').upsert(pinToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert pin:', e);
    throw new Error('Error upserting pin to remote DB');
  }
};

/**
 * Soft delete a pin from Supabase
 * Sets deletedAt timestamp instead of removing the record
 * Used by queue system for delete operations
 */
export const deletePin = async (pinId: string) => {
  try {
    const { error } = await supabase
      .from('pins')
      .update({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', pinId);

    if (error) throw error;
  } catch (e) {
    console.error('Failed to soft delete pin:', e);
    throw new Error('Error soft deleting pin from remote DB');
  }
};
