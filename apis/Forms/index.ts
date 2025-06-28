import { supabase } from '~/utils/supabase';

export const getForms = async () => {
  try {
    const { data, error } = await supabase.from('forms').select('*');
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

export const getForm = async (id: string) => {
  try {
    const { data, error } = await supabase.from('forms').select('*').eq('id', id).limit(1).single();
    if (error) {
      console.error('supabase error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Non-Supabase Error:', err);
    return null;
  }
};
