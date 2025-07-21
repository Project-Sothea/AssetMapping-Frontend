import { supabase } from '~/services/supabase';
import { InsertPin, Pin } from '~/utils/globalTypes';

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

export const update = async (pin: Pin) => {
  try {
    const { error } = await supabase
      .from('pins')
      .update({
        name: pin.name,
        description: pin.description,
        address: pin.address,
        state_province: pin.state_province,
        postal_code: pin.postal_code,
        country: pin.country,
        updated_at: Date(),
      })
      .eq('id', pin.id);

    if (error) throw error;
  } catch (e) {
    console.error(e);
  }
};
