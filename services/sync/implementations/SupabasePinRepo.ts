import { RePin } from '~/utils/globalTypes';
import RemoteRepository from '../interfaces/RemoteRepository';
import { callPin } from '~/apis';

export class SupabasePinRepo implements RemoteRepository<RePin> {
  async fetchAll(): Promise<RePin[]> {
    const pins = await callPin.fetchAll();
    return pins;
  }

  async upsertAll(pins: RePin[]): Promise<void> {
    if (!pins || pins.length === 0) return;
    await callPin.upsertAll(pins);
    return;
  }
}
