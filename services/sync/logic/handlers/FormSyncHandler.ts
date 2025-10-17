// FormSyncHandler.ts (moved)
import { forms } from '~/db/schema';
import { BaseSyncHandler } from '../BaseSyncHandler';
import { Form, ReForm } from '~/utils/globalTypes';

export class FormSyncHandler extends BaseSyncHandler<Form, ReForm, typeof forms> {
  protected async postSync(): Promise<void> {
    console.log('forms postSync');
    return;
  }
}
