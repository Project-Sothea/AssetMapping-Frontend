import { RePin } from '~/utils/globalTypes';
import { RemoteRepository } from '../RemoteRepository';
import { callPin } from '~/apis';
import { convertKeysToCamelCase } from '~/shared/utils/caseConversion';
import { PIN_ARRAY_FIELDS_CAMEL } from '~/shared/utils/fieldMappings';

export class SupabasePinRepo implements RemoteRepository<RePin> {
  async fetchAll(): Promise<RePin[]> {
    const pins = await callPin.fetchAll();
    // Convert snake_case from Supabase to camelCase for local SQLite
    return pins.map((pin) => convertKeysToCamelCase(pin, PIN_ARRAY_FIELDS_CAMEL) as RePin);
  }

  async upsertAll(pins: RePin[]): Promise<void> {
    if (!pins || pins.length === 0) return;
    try {
      await callPin.upsertAll(pins);
    } catch {
      console.error('supabasePinReo UpsertAll Error');
    }
    return;
  }

  async updateFieldsBatch(updates: Partial<RePin>[]): Promise<void> {
    await callPin.updateFieldsBatch(updates);
    return;
  }
}
