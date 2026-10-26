import type { WebSocketStatus } from '~/hooks/RealTimeSync/useWebSocketStatus';
import { getApiUrl } from '~/services/apiUrl';
import { safeJsonParse } from '~/shared/utils/parsing';

type MessageHandler = (message: Record<string, unknown>) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private generation = 0;
  private stopped = true;
  private connecting: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private subscribers = new Set<(status: WebSocketStatus) => void>();
  private handlers = new Set<MessageHandler>();
  private status: WebSocketStatus = {
    status: 'disconnected',
    isConnected: false,
    latency: null,
    reconnectAttempts: 0,
    lastError: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  };

  public connect(userId: string, force = false): Promise<void> {
    if (
      !force &&
      this.userId === userId &&
      !this.stopped &&
      (this.connecting ||
        this.ws?.readyState === WebSocket.OPEN ||
        this.ws?.readyState === WebSocket.CONNECTING)
    )
      return this.connecting ?? Promise.resolve();
    this.disconnect();
    this.userId = userId;
    this.stopped = false;
    const generation = this.generation;
    this.updateStatus({ status: 'connecting', reconnectAttempts: 0 });
    this.connecting = this.createConnection(generation).finally(() => {
      if (this.generation === generation) this.connecting = null;
    });
    return this.connecting;
  }

  public disconnect(): void {
    this.generation++;
    this.stopped = true;
    this.clearTimer();
    const socket = this.ws;
    this.ws = null;
    this.connecting = null;
    if (socket) {
      socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;
      socket.close();
    }
    this.updateStatus({
      status: 'disconnected',
      isConnected: false,
      latency: null,
      lastDisconnectedAt: new Date(),
    });
  }

  public isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  public getStatus(): WebSocketStatus {
    return { ...this.status };
  }
  public subscribe(callback: (status: WebSocketStatus) => void) {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => {
      this.subscribers.delete(callback);
    };
  }
  public onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  public send(message: Record<string, unknown>): boolean {
    if (!this.isConnected()) return false;
    try {
      this.ws!.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  private async createConnection(generation: number) {
    try {
      const api = await getApiUrl();
      if (this.stopped || generation !== this.generation) return;
      if (!api) throw new Error('API URL not configured.');
      const socket = new WebSocket(
        `${api.replace(/^http/, 'ws')}/ws/notifications?userId=${encodeURIComponent(this.userId!)}`
      );
      this.ws = socket;
      const current = () => !this.stopped && this.generation === generation && this.ws === socket;
      socket.onopen = () => {
        if (!current()) return;
        this.clearTimer();
        this.updateStatus({
          status: 'connected',
          isConnected: true,
          reconnectAttempts: 0,
          lastError: null,
          lastConnectedAt: new Date(),
        });
      };
      socket.onmessage = (event) => {
        if (!current()) return;
        const message = safeJsonParse<Record<string, unknown>>(event.data, {});
        for (const handler of this.handlers) {
          try {
            handler(message);
          } catch {
            console.warn('Notification handler failed.');
          }
        }
      };
      socket.onerror = () => {
        if (current())
          this.updateStatus({ status: 'error', isConnected: false, lastError: 'Connection error' });
      };
      socket.onclose = () => {
        if (!current()) return;
        this.ws = null;
        this.updateStatus({
          status: 'disconnected',
          isConnected: false,
          latency: null,
          lastDisconnectedAt: new Date(),
        });
        this.scheduleReconnect(generation);
      };
    } catch (error) {
      if (this.stopped || generation !== this.generation) return;
      this.updateStatus({
        status: 'error',
        isConnected: false,
        lastError: error instanceof Error ? error.message : 'Connection failed',
      });
      this.scheduleReconnect(generation);
    }
  }

  private scheduleReconnect(generation: number) {
    if (this.stopped || this.timer || generation !== this.generation) return;
    if (this.status.reconnectAttempts >= 10) {
      this.updateStatus({ status: 'error', lastError: 'Max reconnection attempts reached' });
      return;
    }
    const delay = Math.min(1000 * 2 ** this.status.reconnectAttempts, 30000);
    this.updateStatus({
      status: 'reconnecting',
      reconnectAttempts: this.status.reconnectAttempts + 1,
    });
    this.timer = setTimeout(() => {
      this.timer = null;
      this.createConnection(generation);
    }, delay);
  }
  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  private updateStatus(update: Partial<WebSocketStatus>) {
    this.status = { ...this.status, ...update };
    for (const callback of this.subscribers) {
      try {
        callback(this.getStatus());
      } catch {
        console.warn('Connection status listener failed.');
      }
    }
  }
}

export const webSocketManager = new WebSocketManager();
