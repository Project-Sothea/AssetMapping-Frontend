import { supabase } from '~/services/supabase';
import { Pin } from '~/utils/globalTypes';

type createPin = Omit<Pin, 'id'>;
export const create = async (pin: createPin) => {
  try {
    const { error } = await supabase.from('pins').insert(pin);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
};
