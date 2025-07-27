import SyncStrategy from './interfaces/SyncStrategy';
import LocalRepository from './interfaces/LocalRepository';
import RemoteRepository from './interfaces/RemoteRepository';

//TODO: Turn into Generic to handle both forms and pins
class SyncManager<LocalType, RemoteType> {
  private static instances: Map<string, SyncManager<any, any>> = new Map();
  private isSyncing = false; //handle deduplication
  private lastSyncedAt: Date | null = null;
  private lastSyncFailedAt: Date | null = null;
  private lastSyncFailure: { at: Date; reason: string } | null = null;

  public static getInstance<LocalType, RemoteType>(
    key: 'pin' | 'form',
    syncStrategy: SyncStrategy<LocalType, RemoteType>,
    localRepo: LocalRepository<LocalType>,
    remoteRepo: RemoteRepository<RemoteType>
  ): SyncManager<LocalType, RemoteType> {
    if (!SyncManager.instances.has(key)) {
      const instance = new SyncManager(syncStrategy, localRepo, remoteRepo);
      SyncManager.instances.set(key, instance);
    }
    return SyncManager.instances.get(key)!;
  }

  private constructor(
    private syncStrategy: SyncStrategy<LocalType, RemoteType>,
    private localRepo: LocalRepository<LocalType>,
    private remoteRepo: RemoteRepository<RemoteType>
  ) {}

  public async syncNow() {
    try {
      if (this.isSyncing) return;
      this.setSyncStart();
      await this.pullToLocalDB();
      await this.pushToRemoteDB();
      this.setSyncSuccess();
      console.log('sync done', new Date());
    } catch (e: any) {
      console.error(e);
      this.setSyncFailure(e);
    }
  }

  private async pullToLocalDB() {
    try {
      const remoteItems = await this.remoteRepo.fetchAll();
      console.log('pulled from remote items: ', remoteItems.length);
      if (remoteItems.length === 0) return;
      const converted = this.syncStrategy.convertToRemote(remoteItems);
      await this.localRepo.upsertFromRemote(converted);
    } catch (e) {
      console.error(e);
      throw new Error('Failed to pull data from remote');
    }
  }
  private async pushToRemoteDB() {
    try {
      const dirty = await this.localRepo.getDirty();
      console.log('pulled from local items: ', dirty.length);
      if (dirty.length === 0) return;
      const formatted = this.syncStrategy.convertToLocal(dirty);
      await this.remoteRepo.upsertAll(formatted);
      await this.localRepo.markAsSynced(dirty);
    } catch (e) {
      console.error(e);
      throw new Error('Failed to push data to remote');
    }
  }

  private setSyncStart() {
    this.isSyncing = true;
  }

  private setSyncSuccess() {
    this.lastSyncedAt = new Date();
    this.isSyncing = false;
    this.lastSyncFailedAt = null;
    this.lastSyncFailure = null;
  }

  private setSyncFailure(e: Error) {
    this.lastSyncFailedAt = new Date();
    this.lastSyncFailure = { at: this.lastSyncFailedAt, reason: e.message };
    this.isSyncing = false;
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
