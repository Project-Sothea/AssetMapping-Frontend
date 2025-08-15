import { Form } from '~/db/schema';
import SyncStrategy from '../../interfaces/SyncStrategy';
import { ReForm } from '~/utils/globalTypes';

export class FormSyncStrategy implements SyncStrategy<Form, ReForm> {
  resolve(
    local: Form[],
    remote: ReForm[]
  ): {
    toLocal: ReForm[];
    toRemote: Form[];
  } {
    const toLocal: ReForm[] = [];
    const toRemote: Form[] = [];

    const allIds = new Set<string>([...local.map((f) => f.id), ...remote.map((f) => f.id)]);

    for (const id of allIds) {
      const localItem = local.find((f) => f.id === id);
      const remoteItem = remote.find((f) => f.id === id);

      //Case 1: New remote item
      if (!localItem && remoteItem) {
        toLocal.push(remoteItem);
        continue;
      }

      //Case 2: Only exists locally, push it
      if (!remoteItem && localItem) {
        toRemote.push(localItem);
        continue;
      }

      // Case 3: Both exist
      if (!localItem || !remoteItem) continue; // Type narrowing

      if (remoteItem.deleted_at && !localItem.deletedAt) {
        // Remote says it's deleted → pull deletion to local
        toLocal.push(remoteItem);
        continue;
      }

      if (localItem.deletedAt && !remoteItem.deleted_at) {
        // Local says it's deleted → push deletion to remote
        toRemote.push(localItem);
        continue;
      }

      const localTime = new Date(localItem.deletedAt ?? localItem.updatedAt).getTime();
      const remoteTime = new Date(remoteItem.deleted_at ?? remoteItem.updated_at!).getTime();

      if (remoteTime > localTime) {
        toLocal.push(remoteItem);
      } else if (localTime > remoteTime) {
        toRemote.push(localItem);
      } else {
        if (localItem.status === 'dirty') {
          toRemote.push(localItem);
        } else {
        }
      }
    }
    return { toLocal, toRemote };
  }

  convertToLocal(remoteItems: ReForm[]): Form[] {
    return remoteItems.map((item) => FormSyncStrategy.fromReForm(item));
  }

  convertToRemote(Forms: Form[]): ReForm[] {
    return Forms.map((item) => FormSyncStrategy.toReForm(item));
  }

  static fromReForm(remote: ReForm): Form {
    return {
      id: remote.id,
      name: remote.name,
      createdAt: remote.created_at,
      updatedAt: remote.updated_at ?? remote.created_at,
      deletedAt: remote.deleted_at,
      failureReason: null,
      status: null,
      lastSyncedAt: null,
      lastFailedSyncAt: null,
      lat: remote.lat,
      lng: remote.lng,
      type: remote.type,
      address: remote.address,
      stateProvince: remote.state_province,
      postalCode: remote.postal_code,
      description: remote.description,
      images: remote.images ? JSON.stringify(remote.images) : null,
      localImages: null,
    };
  }

  static toReForm(local: Form): ReForm {
    return {
      id: local.id,
      name: local.name,
      created_at: local.createdAt,
      updated_at: local.updatedAt,
      deleted_at: local.deletedAt,
      lat: local.lat,
      lng: local.lng,
      type: local.type,
      address: local.address,
      state_province: local.stateProvince,
      postal_code: local.postalCode,
      description: local.description,
      images: local.images ? JSON.parse(local.images) : null,
    };
  }
}
