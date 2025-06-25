import { useState, useCallback, useEffect } from 'react';
import { offlineManager } from '@rnmapbox/maps';
import { DataState } from './types';
import OfflinePack from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflinePack';

//to retrieve offline tile pack stored in the db
//to be called as a function to retrieve tile pack

export const useCachedPacks = () => {
  //states
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  //Callback
  const fetchPacks = useCallback(async () => {
    setLoading(true);

    try {
      const res = await offlineManager.getPacks();
      setData(res);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  //useEffect
  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  return { refetch: fetchPacks, dataState: { data: data, error: error, loading: loading } };
};

/*
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const packs = await offlineManager.getPacks();
      setData(packs);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

*/
