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
import { processQueue } from '~/services/sync/queue/syncQueue';
import { pullPinUpdate, pullFormUpdate } from '~/services/sync/pullUpdates';

interface NotificationMessage {
  type: 'pin' | 'form' | 'image' | 'system' | 'welcome' | 'pong';
  action?: string;
  eventId?: string;
  aggregateId?: string;
  version?: number;
  timestamp?: string;
  payload?: Record<string, unknown>;
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
    const unsubscribe = webSocketManager.onMessage((message) => {
      const notification = message as unknown as NotificationMessage;
      console.log('🔄 WebSocket notification received:', notification);

      // Handle different message types
      switch (notification.type) {
        case 'welcome':
          console.log('📨 Welcome:', notification.message);
          break;

        case 'pong':
          // Heartbeat response (handled by WebSocketManager)
          break;

        case 'pin':
          console.log('📍 Pin update:', notification.action, notification.aggregateId);

          // Handle deleted pins differently - just invalidate cache, don't try to pull
          if (notification.action === 'deleted') {
            console.log('🗑️  Pin deleted, invalidating cache');
            queryClient.invalidateQueries({
              queryKey: ['pins'],
              refetchType: 'active',
            });
          } else if (notification.aggregateId) {
            // Pull updated pin data from backend and save to local database
            pullPinUpdate(notification.aggregateId)
              .then(() => {
                console.log('✅ Pin data synced from backend to local DB');

                // Invalidate React Query cache so UI updates from SQLite
                queryClient.invalidateQueries({
                  queryKey: ['pins'],
                  refetchType: 'active', // Only refetch if component is mounted
                });
              })
              .catch((err) => {
                console.warn('⚠️ Failed to pull pin update:', err);
              });
          }

          // Also process any pending local operations
          processQueue()
            .then(() => {
              console.log('✅ Auto-sync completed after pin update');
            })
            .catch((err) => {
              console.warn('⚠️ Auto-sync failed after pin update:', err);
            });
          break;

        case 'form':
          console.log('📋 Form update:', notification.action, notification.aggregateId);

          // Handle deleted forms differently - just invalidate cache, don't try to pull
          if (notification.action === 'deleted') {
            console.log('🗑️  Form deleted, invalidating cache');
            queryClient.invalidateQueries({
              queryKey: ['forms'],
              refetchType: 'active',
            });
          } else if (notification.aggregateId) {
            // Pull updated form data from backend and save to local database
            pullFormUpdate(notification.aggregateId)
              .then(() => {
                console.log('✅ Form data synced from backend to local DB');

                // Invalidate React Query cache so UI updates from SQLite
                queryClient.invalidateQueries({
                  queryKey: ['forms'],
                  refetchType: 'active', // Only refetch if component is mounted
                });
              })
              .catch((err) => {
                console.warn('⚠️ Failed to pull form update:', err);
              });
          }

          // Also process any pending local operations
          processQueue()
            .then(() => {
              console.log('✅ Auto-sync completed after form update');
            })
            .catch((err) => {
              console.warn('⚠️ Auto-sync failed after form update:', err);
            });
          break;

        case 'image':
          console.log('🖼️  Image update:', notification.action);
          // Refetch the entity that owns the image
          if (notification.payload?.entityType && notification.payload?.entityId) {
            queryClient.invalidateQueries({
              queryKey: [notification.payload.entityType + 's', notification.payload.entityId],
            });
          }
          break;

        case 'system':
          console.log('🔔 System notification:', notification.message);
          break;

        default:
          console.log('📨 Unknown notification:', notification);
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
