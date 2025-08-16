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
    const { error } = await supabase.from('pins').upsert(pins, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert pins:', e);
    throw new Error('error in upserting to remote DB');
  }
};
