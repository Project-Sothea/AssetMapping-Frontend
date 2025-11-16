import { featureCollection, point } from '@turf/helpers';
import type { FeatureCollection, Point } from 'geojson';
import type { Pin } from '~/db/types';

// Utility function to convert pins array to point collection
export const convertPinsToPointCollection = (pins: Pin[]): FeatureCollection<Point> => {
  const points = pins
    .filter((pin) => pin.lng != null && pin.lat != null)
    .map((pin) => point([pin.lng!, pin.lat!], { ...pin }));
  return featureCollection(points);
};
