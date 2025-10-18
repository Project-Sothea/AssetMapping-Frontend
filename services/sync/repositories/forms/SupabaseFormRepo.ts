import { ReForm } from '~/utils/globalTypes';
import { RemoteRepository } from '../RemoteRepository';
import { callForm } from '~/apis';
import { convertKeysToCamelCase } from '~/shared/utils/caseConversion';
import { FORM_ARRAY_FIELDS_CAMEL } from '~/shared/utils/fieldMappings';

export class SupabaseFormRepo implements RemoteRepository<ReForm> {
  async fetchAll(): Promise<ReForm[]> {
    const forms = await callForm.fetchAll();
    // Convert snake_case from Supabase to camelCase for local SQLite
    return forms.map((form) => convertKeysToCamelCase(form, FORM_ARRAY_FIELDS_CAMEL) as ReForm);
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
