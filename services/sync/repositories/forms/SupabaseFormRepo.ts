import { ReForm } from '~/utils/globalTypes';
import { BaseRemoteRepository } from '../BaseRemoteRepository';
import { callForm } from '~/apis';
import { FORM_ARRAY_FIELDS_CAMEL } from '~/shared/utils/fieldMappings';

/**
 * Supabase Form Repository
 * Extends BaseRemoteRepository for common remote operations
 */
export class SupabaseFormRepo extends BaseRemoteRepository<ReForm> {
  constructor() {
    super(callForm, FORM_ARRAY_FIELDS_CAMEL);
  }
}
