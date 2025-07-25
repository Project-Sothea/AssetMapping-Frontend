import { supabase } from '~/services/supabase';
import { InsertPin, RePin } from '~/utils/globalTypes';

export const create = async (pin: InsertPin) => {
  try {
    const { error } = await supabase.from('pins').insert(pin);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
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

export const fetchAllActive = async () => {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .filter('deleted_at', 'is', null);
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

export const update = async (pin: Omit<RePin, 'created_at' | 'updated_at' | 'deleted_at'>) => {
  try {
    const { error } = await supabase
      .from('pins')
      .update({
        ...pin,
        updated_at: new Date(),
      })
      .eq('id', pin.id);

    if (error) throw error;
  } catch (e) {
    console.error(e);
  }
};

export const upsertAll = async (pins: RePin[]) => {
  try {
    const { error } = await supabase.from('pins').upsert(pins, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to update pins:', e);
    throw new Error('error in upserting to remote DB');
  }
};
