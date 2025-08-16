import { supabase } from '~/services/supabase';
import { RePin } from '~/utils/globalTypes';

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
      ({ last_synced_at, last_failed_sync_at, status, failure_reason, local_images, ...rest }) =>
        rest
    );
    console.log(pinsToUpsert);

    const { error } = await supabase.from('pins').upsert(pinsToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert pins:', e);
    throw new Error('Error in upserting to remote DB');
  }
};
