/**
 * WebSocket Manager
 *
 * Centralized WebSocket connection management with status tracking.
 * Provides connection state monitoring, automatic reconnection, and health checks.
 *
 * Features:
 * - Connection state management
 * - Automatic reconnection with exponential backoff
 * - Ping/pong health monitoring
 * - Latency tracking
 * - Status subscription system
 */

import type { WebSocketStatus } from '~/hooks/useWebSocketStatus';

type StatusSubscriber = (status: WebSocketStatus) => void;
type MessageHandler = (message: any) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private apiUrl: string;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pingStartTime: number | null = null;

  // Status tracking
  private status: WebSocketStatus = {
    status: 'disconnected',
    isConnected: false,
    latency: null,
    reconnectAttempts: 0,
    lastError: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  };

  // Subscribers
  private subscribers: Set<StatusSubscriber> = new Set();
  private messageHandlers: Set<MessageHandler> = new Set();

  // Reconnection settings
  private readonly baseReconnectDelay = 1000; // 1 second
  private readonly maxReconnectDelay = 30000; // 30 seconds
  private readonly maxReconnectAttempts = 10;

  constructor() {
    this.apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  }

  /**
   * Connect to WebSocket server
   */
  public connect(userId: string): void {
    if (this.userId === userId && this.isConnected()) {
      console.log('✓ Already connected to WebSocket');
      return;
    }

    this.userId = userId;
    this.disconnect(); // Clean up any existing connection
    this.updateStatus({ status: 'connecting' });
    this.createConnection();
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus({
      status: 'disconnected',
      isConnected: false,
      lastDisconnectedAt: new Date(),
    });
  }

  /**
   * Get current connection status
   */
  public getStatus(): WebSocketStatus {
    return { ...this.status };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Subscribe to status updates
   */
  public subscribe(callback: StatusSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current status
    callback(this.getStatus());

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Subscribe to WebSocket messages
   */
  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Send a message through the WebSocket
   */
  public send(message: any): boolean {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      this.ws?.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Create WebSocket connection
   */
  private createConnection(): void {
    if (!this.userId) {
      console.error('Cannot connect: No user ID provided');
      return;
    }

    try {
      const wsUrl = this.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      const url = `${wsUrl}/ws/notifications?userId=${this.userId}`;

      console.log('🔌 Connecting to WebSocket:', url);
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.updateStatus({
        status: 'error',
        lastError: error instanceof Error ? error.message : 'Connection failed',
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('✓ WebSocket connected');

    this.updateStatus({
      status: 'connected',
      isConnected: true,
      reconnectAttempts: 0,
      lastError: null,
      lastConnectedAt: new Date(),
    });

    // Start ping/pong health check
    this.startPingInterval();
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      // Handle pong response for latency measurement
      if (message.type === 'pong' && this.pingStartTime) {
        const latency = Date.now() - this.pingStartTime;
        this.updateStatus({ latency });
        this.pingStartTime = null;
      }

      // Notify all message handlers
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    console.error('❌ WebSocket error:', error);

    this.updateStatus({
      status: 'error',
      isConnected: false,
      lastError: 'Connection error',
    });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('⊘ WebSocket closed:', event.code, event.reason);

    this.clearTimers();

    const wasConnected = this.status.isConnected;

    this.updateStatus({
      status: 'disconnected',
      isConnected: false,
      latency: null,
      lastDisconnectedAt: new Date(),
    });

    // Attempt reconnection if this wasn't a manual disconnect
    if (wasConnected || this.status.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.status.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.updateStatus({
        status: 'error',
        lastError: 'Max reconnection attempts reached',
      });
      return;
    }

    // Exponential backoff
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.status.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.status.reconnectAttempts + 1}/${this.maxReconnectAttempts})`
    );

    this.updateStatus({
      status: 'reconnecting',
      reconnectAttempts: this.status.reconnectAttempts + 1,
    });

    this.reconnectTimeout = setTimeout(() => {
      if (this.userId) {
        this.createConnection();
      }
    }, delay);
  }

  /**
   * Start ping interval for health monitoring
   */
  private startPingInterval(): void {
    this.clearTimers();

    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.pingStartTime = Date.now();
        this.send({ type: 'ping' });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Update status and notify subscribers
   */
  private updateStatus(updates: Partial<WebSocketStatus>): void {
    this.status = { ...this.status, ...updates };

    // Notify all subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(this.getStatus());
      } catch (error) {
        console.error('Error in status subscriber:', error);
      }
    });
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();
