import { ReForm } from '~/utils/globalTypes';
import RemoteRepository from '../RemoteRepository';
import { callForm } from '~/apis'; // similar to callPin, your API module for forms

export class SupabaseFormRepo implements RemoteRepository<ReForm> {
  async fetchAll(): Promise<ReForm[]> {
    const forms = await callForm.fetchAll();
    return forms;
  }

  async upsertAll(forms: ReForm[]): Promise<void> {
    if (!forms || forms.length === 0) return;
    await callForm.upsertAll(forms);
    return;
  }

  async updateFieldsBatch(updates: Partial<ReForm>[]): Promise<void> {
    await callForm.updateFieldsBatch(updates);
    return;
  }
}
