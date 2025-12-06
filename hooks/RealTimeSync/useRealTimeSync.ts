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

import type { SyncNotification } from '@assetmapping/shared-types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { pullPinUpdate, pullFormUpdate } from '~/services/sync/pullUpdates';
import { processQueue } from '~/services/sync/queue/syncQueue';
import { webSocketManager } from '~/services/websocket/WebSocketManager';

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
      if (!isSyncNotification(message)) {
        console.log('📨 Ignoring non-sync notification:', message);
        return;
      }

      const notification = message;
      console.log('🔄 WebSocket notification received:', notification);

      // Handle different message types
      switch (notification.type) {
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

function isSyncNotification(message: unknown): message is SyncNotification {
  if (!message || typeof message !== 'object') return false;
  const m = message as Record<string, unknown>;
  return (
    (m.type === 'pin' || m.type === 'form') &&
    typeof m.action === 'string' &&
    typeof m.aggregateId === 'string'
  );
}
