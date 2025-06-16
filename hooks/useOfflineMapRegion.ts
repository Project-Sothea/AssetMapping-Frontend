// hooks/useOfflineMapRegion.ts
import { useEffect, useState } from 'react';
import MapboxGL, { offlineManager } from '@rnmapbox/maps';
import OfflinePack from '@rnmapbox/maps/lib/typescript/src/modules/offline/OfflinePack';
import {
  OfflineCreatePackOptionsArgs,
  OfflinePackError,
  OfflineProgressStatus,
} from '@rnmapbox/maps/lib/typescript/src/modules/offline/offlineManager';

//https://github.com/rnmapbox/maps/blob/main/docs/OfflineManager.md

type UseOfflineMapRegionProps = OfflineCreatePackOptionsArgs & {
  enabled?: boolean;
};

export const useOfflineMapRegion = ({
  name, //e.g. Sre O Primary School
  bounds,
  minZoom,
  maxZoom,
  styleURL = MapboxGL.StyleURL.Satellite,
  enabled = true,
}: UseOfflineMapRegionProps) => {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const progressListener = (offlineRegion: OfflinePack, status: OfflineProgressStatus) => {
      setProgress(status.percentage);
      console.log(offlineRegion, status);
    };
    const errorListener = (offlineRegion: OfflinePack, err: OfflinePackError) => {
      setError(err.message);
      console.log(offlineRegion, err);
    };

    const downloadPack = async () => {
      try {
        //check if already cached
        const packs = await offlineManager.getPacks();
        const exists = packs.some((p) => p.name === name);
        if (exists) {
          setStatus('downloaded');
          return;
        }

        setStatus('downloading');

        //create a new pack
        await offlineManager.createPack(
          { name, styleURL, minZoom, maxZoom, bounds },
          progressListener,
          errorListener
        );
      } catch (err: any) {
        setStatus('error');
        setError(err?.message ?? 'Error creating offline pack');
      }
    };

    downloadPack();
  }, [name, bounds, minZoom, maxZoom, styleURL, enabled]);

  return { status, progress, error };
};
