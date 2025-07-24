import { db } from '../drizzleDb';
import { pins, Pin } from '~/db/schema';
import {
  convertKeysToCamel,
  convertKeysToSnake,
  jsonifyImages,
  parseImages,
} from '~/utils/dataShapes';
import { RePin } from '~/utils/globalTypes';
import { or, eq, sql, and, isNotNull, gt, inArray } from 'drizzle-orm';
import { callPin } from '~/apis';

class SyncManager {
  private static instance: SyncManager | null = null;
  private isSyncing = false; //handle deduplication
  private lastSyncedAt: Date | null = null;
  private lastSyncFailedAt: Date | null = null;
  private lastSyncFailure: { at: Date; reason: string } | null = null;

  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  private constructor() {}

  public async syncNow() {
    try {
      this.setSyncStart();
      await this.pullToLocalDB();
      await this.pushToRemoteDB();
      this.setSyncSuccess();
    } catch (e) {
      console.error(e);
      this.setSyncFailure(e);
    }
  }

  private async pullToLocalDB() {
    try {
      const unclean = await callPin.fetchAll();
      if (unclean.length === 0) {
        return;
      }
      console.log('fetched at:', Date(), unclean.length);
      console.log('pins fetched:', unclean.length);

      const data = this.cleanRemotePinData(unclean);

      const remoteUpdatedAt = sql.raw(`excluded.${pins.updatedAt.name}`);
      const remoteDeletedAt = sql.raw(`excluded.${pins.deletedAt.name}`);
      const remoteCreatedAt = sql.raw(`excluded.${pins.createdAt.name}`);

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
            createdAt: remoteCreatedAt,
          },
          setWhere: or(
            sql`${remoteUpdatedAt} > ${pins.updatedAt}`,
            sql`${remoteDeletedAt} IS NOT NULL AND ${pins.deletedAt} IS NULL`
          ),
        })
        .returning({ id: pins.id });
      console.log('ids returned: ', ids);
    } catch (e) {
      console.error(e);
      throw new Error('failed to pull new data into local DB');
    }
  }

  private async pushToRemoteDB() {
    // TODO: implement push logic
    try {
      //get any dirty data from local
      const changes = await db
        .select({
          id: pins.id,
          name: pins.name,
          lat: pins.lat,
          lng: pins.lng,
          type: pins.type,
          address: pins.address,
          state_province: pins.stateProvince,
          postal_code: pins.postalCode,
          country: pins.country,
          description: pins.description,
          images: pins.images,
          updated_at: pins.updatedAt,
          deleted_at: pins.deletedAt,
          created_at: pins.createdAt,
        })
        .from(pins)
        .where(
          or(
            eq(pins.status, 'dirty'), //pins updated or created offline
            and(
              //pins deleted offline (but not created offline)
              eq(pins.status, 'deleted'),
              isNotNull(pins.deletedAt),
              gt(pins.deletedAt, pins.lastSyncedAt)
            )
          ) //TODO: need to update updated_at
        );
      console.log('changes returned:', changes.length);
      if (changes.length === 0) {
        return;
      }
      //push dirty data to remote
      //TODO: abstract away callPin.upsertAll(data); to like replaceDirtyData
      const data = this.cleanLocalData(changes);
      await callPin.upsertAll(data);

      const now = new Date().toISOString();
      const ids = changes.map((pin) => pin.id);

      //mark that dirty data has been synced
      await db
        .update(pins)
        .set({
          status: sql.raw(`CASE 
            WHEN excluded.${pins.deletedAt.name} IS NOT NULL THEN 'deleted' 
            ELSE 'synced' 
            END`),
          lastSyncedAt: now,
          failureReason: null, // clear any previous error
        })
        .where(inArray(pins.id, ids));
    } catch (e) {
      console.error(e);
      throw new Error('failed to push changes to remote DB');
      //TODO: possibly fallback to per batch?
    }
  }

  private cleanRemotePinData(data: RePin[]) {
    return jsonifyImages(convertKeysToCamel(data));
  }

  private cleanLocalData(data: any) {
    return parseImages(convertKeysToSnake(data));
  }

  private setSyncStart() {
    if (this.isSyncing) throw new Error('Sync already in progress');
    this.isSyncing = true;
  }

  private setSyncSuccess() {
    this.isSyncing = false;
    this.lastSyncedAt = new Date();
    this.lastSyncFailedAt = null;
    this.lastSyncFailure = null;
  }

  private setSyncFailure(error: unknown) {
    this.isSyncing = false;
    this.lastSyncFailedAt = new Date();
    this.lastSyncFailure = {
      at: this.lastSyncFailedAt,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export default SyncManager;

/*
          id: pins.id,
          name: pins.name,
          lat: pins.lat,
          lng: pins.lng,
          type: pins.type,
          address: pins.address,
          state_province: pins.stateProvince,
          postal_code: pins.postalCode,
          country: pins.country,
          description: pins.description,
          images: pins.images,
          updated_at: pins.updatedAt,
          deleted_at: pins.deletedAt,
          created_at: pins.createdAt,


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
