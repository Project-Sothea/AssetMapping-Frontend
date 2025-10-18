/**
 * Base Remote Repository
 *
 * Abstract base class for Supabase remote repositories.
 *
 * **UNIFIED FORMAT**: With camelCase columns and JSON string arrays in both
 * SQLite and PostgreSQL, data flows through without any conversion!
 *
 * Handles common patterns:
 * - API calls through provided API client
 * - Error handling with context
 * - Empty array validation
 *
 * Subclasses just need to provide the API client (callPin, callForm, etc.)
 */

import { RemoteRepository } from './RemoteRepository';

/**
 * API Client interface - what we expect from callPin, callForm, etc.
 */
interface APIClient<T> {
  fetchAll(): Promise<T[]>;
  upsertAll(items: Partial<T>[]): Promise<void>;
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
 *     super(callPin);
 *   }
 * }
 * ```
 */
export abstract class BaseRemoteRepository<T> implements RemoteRepository<T> {
  constructor(protected apiClient: APIClient<T>) {}

  /**
   * Fetch all items from Supabase
   * No conversion needed - unified camelCase format!
   */
  async fetchAll(): Promise<T[]> {
    return await this.apiClient.fetchAll();
  }

  /**
   * Upsert items to Supabase
   * No conversion needed - unified format!
   * Works for both full entities and partial updates
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
}
