import { supabase } from '~/services/supabase';
import { CreatePin } from '~/utils/globalTypes';

export const create = async (pin: CreatePin) => {
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
