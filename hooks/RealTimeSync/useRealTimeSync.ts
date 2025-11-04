/**
 * useRealTimeSync Hook
 *
 * Connects to backend WebSocket server for real-time data synchronization.
 * Automatically invalidates React Query caches when server pushes updates.
 *
 * Features:
 * - Automatic reconnection
 * - Ping/pong keep-alive
 * - Per-user connection
 * - Automatic cache invalidation
 * - Connection status tracking
 *
 * Usage:
 * ```tsx
 * // In app/_layout.tsx or root component
 * import { useRealTimeSync } from '@/hooks/useRealTimeSync';
 *
 * export default function RootLayout() {
 *   const { user } = useAuth();
 *   useRealTimeSync(user?.id);
 *
 *   return <YourApp />;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { webSocketManager } from '~/services/websocket/WebSocketManager';
import { processQueue } from '~/services/sync/queue';
import { pullPinUpdate, pullFormUpdate } from '~/services/sync/pullUpdates';

interface NotificationMessage {
  type: 'pin' | 'form' | 'image' | 'system' | 'welcome' | 'pong';
  action?: string;
  eventId?: string;
  aggregateId?: string;
  version?: number;
  timestamp?: string;
  payload?: any;
  message?: string;
}

/**
 * Connect to real-time notification WebSocket
 * Automatically invalidates queries when updates occur
 */
export function useRealTimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      console.log('⊘ Real-time sync: No user ID, skipping connection');
      return;
    }

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        await webSocketManager.connect(userId);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };
    connectWebSocket();

    // Subscribe to incoming messages
    const unsubscribe = webSocketManager.onMessage((message: NotificationMessage) => {
      console.log('🔄 WebSocket notification received:', message);

      // Handle different message types
      switch (message.type) {
        case 'welcome':
          console.log('📨 Welcome:', message.message);
          break;

        case 'pong':
          // Heartbeat response (handled by WebSocketManager)
          break;

        case 'pin':
          console.log('📍 Pin update:', message.action, message.aggregateId);

          // Pull updated pin data from backend and save to local database
          if (message.aggregateId) {
            pullPinUpdate(message.aggregateId)
              .then(() => {
                console.log('✅ Pin data synced from backend to local DB');
              })
              .catch((err: any) => {
                console.warn('⚠️ Failed to pull pin update:', err);
              });
          }

          // Also process any pending local operations
          processQueue()
            .then(() => {
              console.log('✅ Auto-sync completed after pin update');
            })
            .catch((err: any) => {
              console.warn('⚠️ Auto-sync failed after pin update:', err);
            });
          break;

        case 'form':
          console.log('📋 Form update:', message.action, message.aggregateId);

          // Pull updated form data from backend and save to local database
          if (message.aggregateId) {
            pullFormUpdate(message.aggregateId)
              .then(() => {
                console.log('✅ Form data synced from backend to local DB');
              })
              .catch((err: any) => {
                console.warn('⚠️ Failed to pull form update:', err);
              });
          }

          // Also process any pending local operations
          processQueue()
            .then(() => {
              console.log('✅ Auto-sync completed after form update');
            })
            .catch((err: any) => {
              console.warn('⚠️ Auto-sync failed after form update:', err);
            });
          break;

        case 'image':
          console.log('🖼️  Image update:', message.action);
          // Refetch the entity that owns the image
          if (message.payload?.entityType && message.payload?.entityId) {
            queryClient.invalidateQueries({
              queryKey: [message.payload.entityType + 's', message.payload.entityId],
            });
          }
          break;

        case 'system':
          console.log('🔔 System notification:', message.message);
          break;

        default:
          console.log('📨 Unknown notification:', message);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      // Note: We don't disconnect here because other components might be using it
      // The WebSocketManager handles connection lifecycle
    };
  }, [userId, queryClient]);
}
