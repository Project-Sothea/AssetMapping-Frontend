// FormSyncHandler.ts
import { forms } from '~/db/schema';
import { BaseSyncHandler } from './SyncHandler';
import { Form, ReForm } from '~/utils/globalTypes';

export class FormSyncHandler extends BaseSyncHandler<Form, ReForm, typeof forms> {
  protected async postSync(): Promise<void> {
    // No special logic for forms (yet)
    return;
  }
}
