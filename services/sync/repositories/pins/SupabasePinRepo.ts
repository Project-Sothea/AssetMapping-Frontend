import { RePin } from '~/utils/globalTypes';
import { supabase } from '~/services/supabase';
import { RemoteRepository } from '../RemoteRepository';

/**
 * Supabase Pin Repository
 * Direct Supabase integration for bulk sync operations
 * No conversion needed - unified camelCase format!
 */
export class SupabasePinRepo implements RemoteRepository<RePin> {
  async fetchAll(): Promise<RePin[]> {
    try {
      const { data, error } = await supabase.from('pins').select('*');
      if (error) {
        console.error('supabase error:', error.message);
        return [];
      }
      return data as RePin[];
    } catch (err) {
      console.error('Non-Supabase Error:', err);
      return [];
    }
  }

  async upsertAll(pins: Partial<RePin>[]): Promise<void> {
    if (!pins || pins.length === 0) return;
    try {
      const pinsToUpsert = pins.map((pin: any) => ({
        ...pin,
        updatedAt: pin.updatedAt ?? new Date().toISOString(),
      }));

      const { error } = await supabase.from('pins').upsert(pinsToUpsert, { onConflict: 'id' });

      if (error) throw error;
    } catch (e) {
      console.error('Failed to upsert pins:', e);
      throw new Error('Error in upserting to remote DB');
    }
  }
}
