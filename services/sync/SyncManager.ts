import { db } from '../drizzleDb';
import { Pin, pins } from '~/db/schema';
import { convertKeysToCamel, jsonifyImages } from '~/utils/dataShapes';
import { RePin } from '~/utils/globalTypes';
import { or, sql } from 'drizzle-orm';

class SyncManager {
  private static instance: SyncManager | null = null;
  private isSyncing = false;
  private lastSyncedAt: Date | null = null;

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private constructor() {}

  public async pullToLocalDB(data: Pin[]) {
    if (this.isSyncing) return;
    if (data.length === 0) return;
    this.isSyncing = true;
    try {
      const remoteUpdatedAt = sql.raw(`excluded.${pins.updatedAt.name}`);
      const remoteDeletedAt = sql.raw(`excluded.${pins.deletedAt.name}`);

      const ids = await db
        .insert(pins)
        .values(data)
        .onConflictDoUpdate({
          target: pins.id,
          set: {
            name: sql.raw(`excluded.${pins.name.name}`),
            lat: sql.raw(`excluded.${pins.lat.name}`),
            lng: sql.raw(`excluded.${pins.lng.name}`),
            type: sql.raw(`excluded.${pins.type.name}`),
            address: sql.raw(`excluded.${pins.address.name}`),
            stateProvince: sql.raw(`excluded.${pins.stateProvince.name}`),
            postalCode: sql.raw(`excluded.${pins.postalCode.name}`),
            country: sql.raw(`excluded.${pins.country.name}`),
            description: sql.raw(`excluded.${pins.description.name}`),
            images: sql.raw(`excluded.${pins.images.name}`),
            lastSyncedAt: sql`CURRENT_TIMESTAMP`,
            status: sql.raw(`CASE 
              WHEN excluded.${pins.deletedAt.name} IS NOT NULL THEN 'deleted' 
              ELSE 'synced' 
            END`),
            updatedAt: remoteUpdatedAt,
            deletedAt: remoteDeletedAt,
          },
          setWhere: or(
            sql`${remoteUpdatedAt} > ${pins.updatedAt}`,
            sql`${remoteDeletedAt} IS NOT NULL AND ${pins.deletedAt} IS NULL`
          ),
        })
        .returning({ id: pins.id });
      console.log('ids returned: ', ids);
      this.lastSyncedAt = new Date();
    } catch (e) {
      console.error(e);
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushToRemoteDB() {
    // TODO: implement push logic
  }

  public cleanPinData(data: RePin[]) {
    return jsonifyImages(convertKeysToCamel(data));
  }
}

export default SyncManager;

/*
            name: sql.raw(`excluded.${pins.name.name}`),
            lat: sql.raw(`excluded.${pins.lat.name}`),
            lng: sql.raw(`excluded.${pins.lng.name}`),
            type: sql.raw(`excluded.${pins.type.name}`),
            address: sql.raw(`excluded.${pins.address.name}`),
            stateProvince: sql.raw(`excluded.${pins.stateProvince.name}`),
            postalCode: sql.raw(`excluded.${pins.postalCode.name}`),
            country: sql.raw(`excluded.${pins.country.name}`),
            description: sql.raw(`excluded.${pins.description.name}`),
            images: sql.raw(`excluded.${pins.images.name}`),

            updatedAt: excludedUpdatedAt,
            deletedAt: excludedDeletedAt,

*/

// private async initSubscriptions() {
//   this.appState = AppState.currentState;
//   const netInfoState = await NetInfo.fetch();
//   this.hasConnection = !!netInfoState.isConnected && !!netInfoState.isInternetReachable;

//   // 2. Setup listeners AFTER initial state
//   this.AppSubscription = AppState.addEventListener('change', this.setAppState.bind(this));
//   this.unsubscribe = NetInfo.addEventListener(this.setConnected.bind(this));

//   // 3. Start or not depending on readiness
//   this.handleStateChange();
// }
// private setAppState(state: AppStateStatus) {
//   console.log('app state: ', state);
//   this.appState = state;
//   this.handleStateChange();
// }

// private setConnected(state: NetInfoState) {
//   console.log('internet state: ', state.isConnected);
//   this.hasConnection = !!state.isConnected && !!state.isInternetReachable;
//   this.handleStateChange();
// }

// private isReadyToSync() {
//   return this.appState === 'active' && this.hasConnection;
// }

// private handleStateChange() {
//   if (this.isReadyToSync()) {
//     this.startPolling();
//   } else {
//     this.dispose();
//   }
// }

//   public async manualSync() {
//   if (!this.isReadyToSync() || this.isSyncing) return;
//   await this.pullFromRemote();
// }

// public dispose() {
//   console.log('disposing', this.timerId);
//   this.stopPolling(); // clearInterval
//   this.AppSubscription.remove();
//   this.unsubscribe();
// }

//   public async startPolling() {
//   if (this.timerId) {
//     console.log('polling already active. skip setInterval');
//     return this.timerId;
//   }
//   console.log('Starting syncManager polling...');
//   // if (this.isReadyToSync()) {
//   //   await this.pullFromRemote();
//   // }
//   this.timerId = setInterval(() => {
//     //   if (this.isReadyToSync()) {
//     //     this.pullFromRemote();
//     //   }
//     console.log('ran: ', this.timerId);
//   }, this.syncDelayMs);

//   return this.timerId;
// }

// public stopPolling() {
//   if (this.timerId) {
//     console.log('clearing:', this.timerId);
//     clearInterval(this.timerId);
//     this.timerId = null;
//   }
// }
