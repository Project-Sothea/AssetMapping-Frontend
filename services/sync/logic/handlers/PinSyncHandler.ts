// PinSyncHandler.ts (moved)
import { pins } from '~/db/schema';
import { BaseSyncHandler } from '../BaseSyncHandler';
import { Pin, RePin } from '~/db/types';

export class PinSyncHandler extends BaseSyncHandler<Pin, RePin, typeof pins> {
  protected async postSync(localUpserts: Pin[], remoteUpserts: Pin[]): Promise<void> {
    // Image sync is now handled in the queue API (pins.ts) using signed URLs
    // No additional image processing needed here
    console.log('pin sync complete (images handled in queue)');
  }
}
