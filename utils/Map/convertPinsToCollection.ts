import { featureCollection, point } from '@turf/helpers';
import type { Pin } from '~/utils/globalTypes'; // Adjust according to your types
import type { FeatureCollection, Point } from 'geojson';

// Utility function to convert pins array to point collection
export const convertPinsToPointCollection = (pins: Pin[]): FeatureCollection<Point> => {
  const points = pins.map((pin) => point([pin.lng, pin.lat], { ...pin }));
  return featureCollection(points);
};
