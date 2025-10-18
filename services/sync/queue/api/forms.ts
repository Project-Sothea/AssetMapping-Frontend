import { supabase } from '~/services/supabase';
import { Form } from '~/utils/globalTypes';

/**
 * Upsert a single form to Supabase
 * Used by queue system for individual sync operations
 */
export const upsertOne = async (form: Form) => {
  try {
    // Strip out local-only fields before upserting
    const { failureReason, status, lastSyncedAt, lastFailedSyncAt, ...rest } = form;

    const formToUpsert = {
      ...rest,
      updatedAt: rest.updatedAt ?? new Date().toISOString(),
    };

    const { error } = await supabase.from('forms').upsert(formToUpsert, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert form:', e);
    throw new Error('Error upserting form to remote DB');
  }
};

/**
 * Soft delete a form from Supabase
 * Sets deletedAt timestamp instead of removing the record
 * Used by queue system for delete operations
 */
export const deleteForm = async (formId: string) => {
  try {
    const { error } = await supabase
      .from('forms')
      .update({
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', formId);

    if (error) throw error;
  } catch (e) {
    console.error('Failed to soft delete form:', e);
    throw new Error('Error soft deleting form from remote DB');
  }
};
