import { supabase } from '~/services/supabase';
import { ReForm } from '~/utils/globalTypes';
import { convertKeysToSnakeCase } from '~/shared/utils/caseConversion';
import { FORM_ARRAY_FIELDS_SNAKE } from '~/shared/utils/fieldMappings';

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
        ...rest,
        updated_at: rest.updated_at ?? new Date().toISOString(),
      })
    );

    // Convert camelCase to snake_case for Supabase
    const formsWithSnakeCase = formsToUpsert.map((form) =>
      convertKeysToSnakeCase(form, FORM_ARRAY_FIELDS_SNAKE)
    );
    console.log(formsWithSnakeCase);

    const { error } = await supabase.from('forms').upsert(formsWithSnakeCase, { onConflict: 'id' });

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
        ...rest,
        updated_at: rest.updated_at ?? new Date().toISOString(),
      })
    );

    // Convert camelCase to snake_case for Supabase
    const formsWithSnakeCase = formsToUpsert.map((form) =>
      convertKeysToSnakeCase(form, FORM_ARRAY_FIELDS_SNAKE)
    );
    console.log(formsWithSnakeCase);

    const { error } = await supabase.from('forms').upsert(formsWithSnakeCase, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert forms:', e);
    throw new Error('Error in upserting to remote DB');
  }
};

/**
 * Upsert a single form to Supabase
 * Used by queue system for individual sync operations
 */
export const upsertOne = async (form: ReForm) => {
  try {
    // Strip out local-only fields before upserting
    const { failure_reason, status, last_synced_at, last_failed_sync_at, ...rest } = form;

    const formToUpsert = {
      ...rest,
      updated_at: rest.updated_at ?? new Date().toISOString(),
    };

    // Convert camelCase to snake_case for Supabase
    const formWithSnakeCase = convertKeysToSnakeCase(formToUpsert, FORM_ARRAY_FIELDS_SNAKE);

    const { error } = await supabase.from('forms').upsert(formWithSnakeCase, { onConflict: 'id' });

    if (error) throw error;
  } catch (e) {
    console.error('Failed to upsert form:', e);
    throw new Error('Error upserting form to remote DB');
  }
};

/**
 * Soft delete a form from Supabase
 * Sets deleted_at timestamp instead of removing the record
 * Used by queue system for delete operations
 */
export const deleteForm = async (formId: string) => {
  try {
    const { error } = await supabase
      .from('forms')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', formId);

    if (error) throw error;
  } catch (e) {
    console.error('Failed to soft delete form:', e);
    throw new Error('Error soft deleting form from remote DB');
  }
};
