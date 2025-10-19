import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useEffect, useState } from 'react';
import { setQueryClient } from '~/services/sync/queue/api/pins';

/**
 * QueryProvider with offline-first configuration
 *
 * Features:
 * - Caches data locally for offline access
 * - Retries failed mutations automatically
 * - Uses 'offlineFirst' network mode (works offline, syncs when online)
 *
 * Note: For persistent offline queue, combine with existing pinService.
 * React Query will cache and retry, but won't persist mutations across app restarts.
 */
export default function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests
            retry: 2,
            // Refetch on window focus
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect (we'll handle this manually)
            refetchOnReconnect: false,
            // Network mode: always try to fetch, even offline (for cache)
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry mutations on network restore
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Network mode: pause mutations when offline, resume when online
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  // Initialize PinsAPI with queryClient for cache invalidation on errors
  useEffect(() => {
    setQueryClient(client);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
