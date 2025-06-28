import { Form } from '~/utils/database.types';
import { supabase } from '~/utils/supabase';

export const getForms = async () => {
  try {
    const { data, error } = await supabase.from('forms').select('*').eq('is_active', true);
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
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .limit(1)
      .single();
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

export const createForm = async (form: Form) => {
  try {
    const { error } = await supabase.from('forms').insert(form);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
};

export const updateForm = async (id: string, values: Partial<Form>) => {
  try {
    const { error } = await supabase.from('forms').update(values).eq('id', id);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
};

export const softDeleteForm = async (id: string) => {
  try {
    const { error } = await supabase
      .from('forms')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('supabase error:', error.message);
    }
  } catch (err) {
    console.error('Non-Supabase Error:', err);
  }
};
