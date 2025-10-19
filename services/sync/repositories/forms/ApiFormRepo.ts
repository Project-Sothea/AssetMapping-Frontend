import { ReForm } from '~/utils/globalTypes';
import { RemoteRepository } from '../RemoteRepository';
import { apiClient } from '~/services/apiClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * API-based Form Repository
 * Uses backend sync API instead of direct Supabase calls
 */
export class ApiFormRepo implements RemoteRepository<ReForm> {
  async fetchAll(): Promise<ReForm[]> {
    try {
      const response = await apiClient.fetchForms();

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch forms from backend');
      }

      return (response.data || []) as ReForm[];
    } catch (error) {
      console.error('Failed to fetch forms from API:', error);
      throw new Error('Error fetching forms from backend');
    }
  }

  async upsertAll(forms: Partial<ReForm>[]): Promise<void> {
    if (!forms || forms.length === 0) return;

    try {
      // Convert forms to sync requests
      const syncRequests = forms.map((form) => ({
        idempotencyKey: uuidv4(),
        entityType: 'form' as const,
        operation: (form.id ? 'update' : 'create') as 'create' | 'update' | 'delete',
        payload: form,
        deviceId: 'mobile-app', // TODO: Get actual device ID
        timestamp: new Date().toISOString(),
      }));

      // Use batch sync API
      const response = await apiClient.batchSync(syncRequests);

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync forms');
      }

      // Check for failures
      const failures = response.data?.results.filter((r) => !r.success);
      if (failures && failures.length > 0) {
        console.error('Some form sync operations failed:', failures);
        throw new Error(`${failures.length} form sync operations failed`);
      }
    } catch (error) {
      console.error('Failed to upsert forms via API:', error);
      throw new Error('Error syncing forms to backend');
    }
  }
}
