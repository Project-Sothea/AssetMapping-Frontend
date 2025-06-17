import { snapshotManager } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';

type coord = number[];
export const createSnapshotCenter = async (
  coord: coord,
  width: number,
  height: number,
  zoom: number
) => {
  try {
    const uri = await MapboxGL.snapshotManager.takeSnap({
      centerCoordinate: coord,
      width: width,
      height: height,
      zoomLevel: zoom,
      pitch: 0,
      heading: 0,
      styleURL: MapboxGL.StyleURL.SatelliteStreet,
    });
    return uri;
  } catch (err) {
    console.error('Snapshot error:', err);
  }
};
