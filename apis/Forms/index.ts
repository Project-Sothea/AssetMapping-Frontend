import { supabase } from '~/services/supabase';
import { ReForm } from '~/utils/globalTypes';

export const fetchAll = async () => {
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

export const upsertAll = async (forms: ReForm[]) => {
  try {
    // Strip out local-only fields before upserting
    const formsToUpsert = forms.map(
      ({ failure_reason, status, last_synced_at, last_failed_sync_at, ...rest }) => ({
        rest,
        updated_at: rest.updated_at ?? new Date().toISOString(),
      })
    );
    console.log(formsToUpsert);

    const { error } = await supabase.from('forms').upsert(formsToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert forms:', e);
    throw new Error('Error in upserting to remote DB');
  }
};

export const updateFieldsBatch = async (forms: Partial<ReForm>[]) => {
  try {
    // Strip out local-only fields before upserting
    const formsToUpsert = forms.map(
      ({ failure_reason, status, last_synced_at, last_failed_sync_at, ...rest }) => ({
        rest,
        updated_at: rest.updated_at ?? new Date().toISOString(),
      })
    );
    console.log(formsToUpsert);

    const { error } = await supabase.from('forms').upsert(formsToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert forms:', e);
    throw new Error('Error in upserting to remote DB');
  }
};
