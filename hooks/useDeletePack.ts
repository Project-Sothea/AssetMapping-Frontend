import { useState, useCallback } from 'react';
import MapboxGL from '@rnmapbox/maps';

export const useDeleteOfflineMapPack = () => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const deletePack = useCallback(async (packName: string) => {
    setDeleting(true);
    setError(null);
    setSuccess(false);

    try {
      await MapboxGL.offlineManager.deletePack(packName);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setDeleting(false);
    }
  }, []);

  return {
    deletePack,
    deleting,
    error,
    success,
  };
};
