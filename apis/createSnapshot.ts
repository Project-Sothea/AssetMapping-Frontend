import { snapshotManager } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';

type bounds = number[][];
export const createSnapshot = async (bounds: bounds, width: number, height: number) => {
  try {
    const uri = await snapshotManager.takeSnap({
      bounds: bounds,
      width: width,
      height: height,
      styleURL: MapboxGL.StyleURL.SatelliteStreet,
    });
    return uri;
  } catch (err) {
    console.error('Snapshot error:', err);
  }
};
