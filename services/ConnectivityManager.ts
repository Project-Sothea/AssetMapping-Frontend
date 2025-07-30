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
      this.isConnected = !!state.isConnected;
    });
  }

  static getInstance(): ConnectivityManager {
    if (!ConnectivityManager.instance) {
      ConnectivityManager.instance = new ConnectivityManager();
    }
    return ConnectivityManager.instance;
  }

  private handleNetworkChange = (state: NetInfoState) => {
    const newStatus = !!state.isConnected && !!state.isInternetReachable;
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
    callback(this.isConnected);
  }

  public unsubscribe(callback: (isConnected: boolean) => void) {
    this.subscribers = this.subscribers.filter((cb) => cb !== callback);
  }
}
