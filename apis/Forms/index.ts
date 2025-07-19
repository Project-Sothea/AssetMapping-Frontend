import { supabase } from '~/services/supabase';
import { Form } from '~/utils/globalTypes';

export const getForms = async (pin_id: string) => {
  try {
    const { data, error } = await supabase.from('forms').select('*').eq('pin_id', pin_id);
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

// for pull syncing, need to receive ISODateString i.e. Date().toISOString()
export const syncPullLatestForms = async (lastSyncTime: string) => {
  try {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .gt('updated_at', lastSyncTime)
      .eq('is_active', true);
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

export const syncForms = async (lastSyncTime: string) => {
  try {
    //fetch "dirty" data from database. const localChanges;
    //call a supabase rpc:
    //  const response = await supabase.rpc("syncForms", {
    //  changes: localChanges,
    //  lastSyncTime,
    //  });
    //Apply server changes to localDB:
    //  await localDB.applyServerChanges(response.updatedForms);
    //Clear synced flags:
    //  await localDB.clearSyncFlags(localChanges.map(c => c.id));
  } catch (err) {
    console.error('Non-Supabase Error:', err);
    return [];
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
