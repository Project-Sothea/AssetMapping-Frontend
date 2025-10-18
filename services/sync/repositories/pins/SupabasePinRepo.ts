import { RePin } from '~/utils/globalTypes';
import { BaseRemoteRepository } from '../BaseRemoteRepository';
import { callPin } from '~/apis';
import { PIN_ARRAY_FIELDS_CAMEL } from '~/shared/utils/fieldMappings';

/**
 * Supabase Pin Repository
 * Extends BaseRemoteRepository for common remote operations
 */
export class SupabasePinRepo extends BaseRemoteRepository<RePin> {
  constructor() {
    super(callPin, PIN_ARRAY_FIELDS_CAMEL);
  }
}
