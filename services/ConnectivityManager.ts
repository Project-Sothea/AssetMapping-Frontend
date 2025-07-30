// ConnectivityManager.ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export class ConnectivityManager {
  private static instance: ConnectivityManager;
  private isConnected: boolean = true;
  private subscribers: ((isConnected: boolean) => void)[] = [];

  private constructor() {
    NetInfo.addEventListener(this.handleNetworkChange);
    // Optionally fetch current state at init
    NetInfo.fetch().then((state) => {
      const newStatus = !!state.isConnected;
      if (newStatus !== this.isConnected) {
        this.isConnected = newStatus;
        this.subscribers.forEach((cb) => cb(this.isConnected));
      }
    });
  }

  static getInstance(): ConnectivityManager {
    if (!ConnectivityManager.instance) {
      ConnectivityManager.instance = new ConnectivityManager();
    }
    return ConnectivityManager.instance;
  }

  private handleNetworkChange = (state: NetInfoState) => {
    const newStatus = !!state.isConnected;
    console.log('[ConnectivityManager] Network change detected:', newStatus);
    if (newStatus !== this.isConnected) {
      this.isConnected = newStatus;
      this.subscribers.forEach((cb) => cb(this.isConnected));
    }
  };

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public subscribe(callback: (isConnected: boolean) => void) {
    this.subscribers.push(callback);
    // Immediately notify
    console.log('callback subscription now connected?', this.isConnected);
    callback(this.isConnected);
  }

  public unsubscribe(callback: (isConnected: boolean) => void) {
    this.subscribers = this.subscribers.filter((cb) => cb !== callback);
  }
  public handleExternalStatusChange(newStatus: boolean) {
    if (newStatus !== this.isConnected) {
      this.isConnected = newStatus;
      this.subscribers.forEach((cb) => cb(this.isConnected));
    }
  }

  public setConnectionStatus(status: boolean) {
    if (status !== this.isConnected) {
      this.isConnected = status;
      this.subscribers.forEach((cb) => cb(this.isConnected));
    }
  }
}
