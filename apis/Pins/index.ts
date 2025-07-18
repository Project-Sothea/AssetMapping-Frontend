import { supabase } from '~/services/supabase';
import { Pin } from '~/utils/globalTypes';

export const createPin = async (pin: Pin) => {
  try {
    const { error } = await supabase.from('pins').insert(pin);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
};
