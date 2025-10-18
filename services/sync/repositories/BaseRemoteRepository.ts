/**
 * Base Remote Repository
 *
 * Abstract base class for Supabase remote repositories.
 * Handles common patterns:
 * - API calls through provided API client
 * - snake_case to camelCase conversion
 * - Array field handling
 * - Error handling
 *
 * Subclasses just need to provide:
 * - API client (callPin, callForm, etc.)
 * - Array field mappings
 */

import { convertKeysToCamelCase } from '~/shared/utils/caseConversion';
import { RemoteRepository } from './RemoteRepository';

/**
 * API Client interface - what we expect from callPin, callForm, etc.
 */
interface APIClient<T> {
  fetchAll(): Promise<any[]>;
  upsertAll(items: Partial<T>[]): Promise<void>;
  updateFieldsBatch(updates: Partial<T>[]): Promise<void>;
}

/**
 * Base class for remote repositories (Supabase)
 *
 * @template T - The entity type (Pin, Form, etc.)
 *
 * @example
 * ```typescript
 * export class SupabasePinRepo extends BaseRemoteRepository<RePin> {
 *   constructor() {
 *     super(callPin, PIN_ARRAY_FIELDS_CAMEL);
 *   }
 * }
 * ```
 */
export abstract class BaseRemoteRepository<T> implements RemoteRepository<T> {
  constructor(
    protected apiClient: APIClient<T>,
    protected arrayFields: string[] = []
  ) {}

  /**
   * Fetch all items from Supabase and convert to camelCase
   */
  async fetchAll(): Promise<T[]> {
    const items = await this.apiClient.fetchAll();
    // Convert snake_case from Supabase to camelCase for local SQLite
    return items.map((item) => convertKeysToCamelCase(item, this.arrayFields) as T);
  }

  /**
   * Upsert items to Supabase
   * Conversion handled by API layer
   */
  async upsertAll(items: Partial<T>[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      await this.apiClient.upsertAll(items);
    } catch (error) {
      console.error(`${this.constructor.name} upsertAll error:`, error);
      throw error;
    }
  }

  /**
   * Update specific fields for multiple items
   * Conversion handled by API layer
   */
  async updateFieldsBatch(updates: Partial<T>[]): Promise<void> {
    if (!updates || updates.length === 0) return;
    try {
      await this.apiClient.updateFieldsBatch(updates);
    } catch (error) {
      console.error(`${this.constructor.name} updateFieldsBatch error:`, error);
      throw error;
    }
  }
}
