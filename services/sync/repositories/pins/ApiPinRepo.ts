import { RePin } from '~/utils/globalTypes';
import { RemoteRepository } from '../RemoteRepository';
import { apiClient } from '~/services/apiClient';
import { v4 as uuidv4 } from 'uuid';

/**
 * API-based Pin Repository
 * Uses backend sync API instead of direct Supabase calls
 */
export class ApiPinRepo implements RemoteRepository<RePin> {
  async fetchAll(): Promise<RePin[]> {
    try {
      const response = await apiClient.fetchPins();

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch pins from backend');
      }

      return (response.data || []) as RePin[];
    } catch (error) {
      console.error('Failed to fetch pins from API:', error);
      throw new Error('Error fetching pins from backend');
    }
  }

  async upsertAll(pins: Partial<RePin>[]): Promise<void> {
    if (!pins || pins.length === 0) return;

    try {
      // Convert pins to sync requests
      const syncRequests = pins.map((pin) => ({
        idempotencyKey: uuidv4(),
        entityType: 'pin' as const,
        operation: (pin.id ? 'update' : 'create') as 'create' | 'update' | 'delete',
        payload: pin,
        deviceId: 'mobile-app', // TODO: Get actual device ID
        timestamp: new Date().toISOString(),
      }));

      // Use batch sync API
      const response = await apiClient.batchSync(syncRequests);

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync pins');
      }

      // Check for failures
      const failures = response.data?.results.filter((r) => !r.success);
      if (failures && failures.length > 0) {
        console.error('Some pin sync operations failed:', failures);
        throw new Error(`${failures.length} pin sync operations failed`);
      }
    } catch (error) {
      console.error('Failed to upsert pins via API:', error);
      throw new Error('Error syncing pins to backend');
    }
  }
}
