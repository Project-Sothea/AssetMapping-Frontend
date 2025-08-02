import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const CONNECTIVITY_CHECK_TIMEOUT = 3000;

const checkInternetConnectivity = async (): Promise<boolean> => {
  try {
    const networkState = await NetInfo.fetch();

    if (!networkState.isConnected) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_CHECK_TIMEOUT);

    try {
      await fetch('https://8.8.8.8', {
        method: 'HEAD',
        signal: controller.signal,
      });
      console.log('connected to 8.8.8.8');
      return true;
    } catch (error) {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    return false;
  }
};

export const useInternetAvailability = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const connected = await checkInternetConnectivity();
      setIsConnected(connected);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let retryTimeout: number;

    const handleNetInfoChange = async (state: NetInfoState) => {
      if (!mounted) return;

      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      if (state.isConnected === false) {
        setIsConnected(false);
      } else {
        retryTimeout = setTimeout(async () => {
          if (mounted) {
            await checkConnection();
          }
        }, 1000);
      }
    };

    checkConnection();

    const unsubscribe = NetInfo.addEventListener(handleNetInfoChange);

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      unsubscribe();
    };
  }, [checkConnection]);

  const recheckConnection = useCallback(() => {
    console.log('rechecking');
    return checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    recheckConnection,
  };
};
