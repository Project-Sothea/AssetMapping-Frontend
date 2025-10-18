import { ReForm } from '~/utils/globalTypes';
import { supabase } from '~/services/supabase';
import { RemoteRepository } from '../RemoteRepository';

/**
 * Supabase Form Repository
 * Direct Supabase integration for bulk sync operations
 * No conversion needed - unified camelCase format!
 */
export class SupabaseFormRepo implements RemoteRepository<ReForm> {
  async fetchAll(): Promise<ReForm[]> {
    try {
      const { data, error } = await supabase.from('forms').select('*');
      if (error) {
        console.error('supabase error:', error.message);
        return [];
      }
      return data as ReForm[];
    } catch (err) {
      console.error('Non-Supabase Error:', err);
      return [];
    }
  }

  async upsertAll(forms: Partial<ReForm>[]): Promise<void> {
    if (!forms || forms.length === 0) return;
    try {
      const formsToUpsert = forms.map((form: any) => ({
        ...form,
        updatedAt: form.updatedAt ?? new Date().toISOString(),
      }));

      const { error } = await supabase.from('forms').upsert(formsToUpsert, { onConflict: 'id' });

      if (error) throw error;
    } catch (e) {
      console.error('Failed to upsert forms:', e);
      throw new Error('Error in upserting to remote DB');
    }
  }
}
