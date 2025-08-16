import { convertKeysToCamel, convertKeysToSnake } from '~/utils/dataShapes';

export class SyncStrategy<
  LocalType extends {
    id: string;
    updatedAt: string | null;
    deletedAt: string | null;
    status: string | null;
  },
  RemoteType extends { id: string; updated_at: string | null; deleted_at: string | null },
> {
  convertToLocal(remoteItems: RemoteType[]): LocalType[] {
    return remoteItems.map(convertKeysToCamel);
  }
  convertToRemote(localItems: LocalType[]): RemoteType[] {
    return localItems.map(convertKeysToSnake);
  }

  resolve(local: LocalType[], remote: RemoteType[]) {
    const toLocal: RemoteType[] = [];
    const toRemote: LocalType[] = [];

    const allIds = new Set<string>([...local.map((p) => p.id), ...remote.map((p) => p.id)]);

    for (const id of allIds) {
      const localItem = local.find((p) => p.id === id);
      const remoteItem = remote.find((p) => p.id === id);

      // New remote
      if (!localItem && remoteItem) {
        toLocal.push(remoteItem);
        continue;
      }

      // New local
      if (!remoteItem && localItem) {
        toRemote.push(localItem);
        continue;
      }

      if (!localItem || !remoteItem) continue;

      // Remote deleted → pull delete
      if (remoteItem.deleted_at && !localItem.deletedAt) {
        toLocal.push(remoteItem);
        continue;
      }

      // Local deleted → push delete
      if (localItem.deletedAt && !remoteItem.deleted_at) {
        toRemote.push(localItem);
        continue;
      }

      const localTime = new Date(localItem.deletedAt ?? localItem.updatedAt ?? 0).getTime();
      const remoteTime = new Date(remoteItem.deleted_at ?? remoteItem.updated_at ?? 0).getTime();

      if (remoteTime > localTime) {
        toLocal.push(remoteItem);
      } else if (localTime > remoteTime) {
        toRemote.push(localItem);
      } else {
        // Equal timestamps → if local dirty, push
        if (localItem.status === 'dirty') {
          toRemote.push(localItem);
        }
      }
    }

    return { toLocal, toRemote };
  }
}
