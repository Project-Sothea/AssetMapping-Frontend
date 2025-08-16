// FormSyncHandler.ts
import { forms } from '~/db/schema';
import { BaseSyncHandler } from './BaseSyncHandler';
import { Form, ReForm } from '~/utils/globalTypes';
import { SyncStrategy } from '../implementations/SyncStrategy';
import { LocalRepository } from '../implementations/LocalRepository';
import RemoteRepository from '../implementations/RemoteRepository';

export class FormSyncHandler extends BaseSyncHandler<Form, ReForm, typeof forms> {
  private static instance: FormSyncHandler | null = null;

  public static getInstance(
    strategy: SyncStrategy<Form, ReForm>,
    localRepo: LocalRepository<Form, typeof forms>,
    remoteRepo: RemoteRepository<ReForm>
  ) {
    if (!FormSyncHandler.instance) {
      FormSyncHandler.instance = new FormSyncHandler(strategy, localRepo, remoteRepo);
    }
    return FormSyncHandler.instance;
  }

  protected async postSync(): Promise<void> {
    // No special logic for forms (yet)
    console.log('forms postSync');
    return;
  }
}
