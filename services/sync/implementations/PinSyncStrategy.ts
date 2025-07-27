import { Pin } from '~/db/schema';
import SyncStrategy from '../interfaces/SyncStrategy';
import { RePin } from '~/utils/globalTypes';

export class PinSyncStrategy implements SyncStrategy<Pin, RePin> {
  resolve(
    local: Pin[],
    remote: RePin[]
  ): {
    toPullToLocal: RePin[];
    toPushToRemote: Pin[];
  } {
    const toPullToLocal: RePin[] = [];
    const toPushToRemote: Pin[] = [];

    const allIds = new Set<string>([...local.map((p) => p.id), ...remote.map((p) => p.id)]);

    for (const id of allIds) {
      const localItem = local.find((p) => p.id === id);
      const remoteItem = remote.find((p) => p.id === id);

      //Case 1: New remote item
      if (!localItem && remoteItem) {
        toPullToLocal.push(remoteItem);
        continue;
      }

      //Case 2: Only exists locally, push it
      if (!remoteItem && localItem) {
        toPushToRemote.push(localItem);
        continue;
      }

      // Case 3: Both exist
      if (!localItem || !remoteItem) continue; // Type narrowing

      if (remoteItem.deleted_at && !localItem.deletedAt) {
        // Remote says it's deleted → pull deletion to local
        toPullToLocal.push(remoteItem);
        continue;
      }

      if (localItem.deletedAt && !remoteItem.deleted_at) {
        // Local says it's deleted → push deletion to remote
        toPushToRemote.push(localItem);
        continue;
      }

      const localTime = new Date(localItem.deletedAt ?? localItem.updatedAt).getTime();
      const remoteTime = new Date(remoteItem.deleted_at ?? remoteItem.updated_at!).getTime();

      if (remoteTime > localTime) {
        toPullToLocal.push(remoteItem);
      } else if (localTime > remoteTime) {
        toPushToRemote.push(localItem);
      } else {
      }
    }
    return { toPullToLocal, toPushToRemote };
  }

  convertToRemote(remoteItems: RePin[]): Pin[] {
    return remoteItems.map((item) => PinSyncStrategy.fromRePin(item));
  }

  convertToLocal(pins: Pin[]): RePin[] {
    return pins.map((item) => PinSyncStrategy.toRePin(item));
  }

  static fromRePin(remote: RePin): Pin {
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
      country: remote.country,
      description: remote.description,
      images: remote.images ? JSON.stringify(remote.images) : null,
      localImages: null,
    };
  }

  static toRePin(local: Pin): RePin {
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
      country: local.country,
      description: local.description,
      images: local.images ? JSON.parse(local.images) : null,
    };
  }
}
