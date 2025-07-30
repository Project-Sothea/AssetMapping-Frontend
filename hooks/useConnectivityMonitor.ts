import { useEffect, useRef } from 'react';
import { ConnectivityManager } from '~/services/ConnectivityManager';

export const useConnectivityMonitor = () => {
  const pollingRef = useRef<number | null>(null);

  const fetchExampleDotCom = async (): Promise<boolean> => {
    try {
      const res = await fetch('https://example.com');
      return res.ok;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const manager = ConnectivityManager.getInstance();

    const startPolling = () => {
      if (pollingRef.current) return; // already polling

      console.log('[Recovery] Starting offline polling...');
      pollingRef.current = setInterval(async () => {
        const isBackOnline = await fetchExampleDotCom();
        console.log('polling result', isBackOnline);

        if (isBackOnline) {
          console.log('[Recovery] Reconnected via example.com!');
          manager.setConnectionStatus(true); // force status update
          stopPolling();
        }
      }, 5000); // check every 5 seconds
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        console.log('[Recovery] Stopped polling.');
      }
    };

    const onStatusChange = (connected: boolean) => {
      if (!connected) {
        startPolling();
      } else {
        stopPolling();
      }
    };

    manager.subscribe(onStatusChange);

    return () => {
      stopPolling();
      manager.unsubscribe(onStatusChange);
    };
  }, []);
};
