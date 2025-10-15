import { featureCollection, point } from '@turf/helpers';
import type { FeatureCollection, Point } from 'geojson';
import { Pin } from '~/db/schema';

// Utility function to convert pins array to point collection
export const convertPinsToPointCollection = (pins: Pin[]): FeatureCollection<Point> => {
  const points = pins
    .filter((pin) => pin.lng != null && pin.lat != null)
    .map((pin) => 
      point([pin.lng!, pin.lat!], {
        id: pin.id,
        name: pin.name ?? '',
        cityVillage: pin.cityVillage ?? '',
        address: pin.address ?? '',
        description: pin.description ?? '',
        type: pin.type ?? '',
        lat: pin.lat,
        lng: pin.lng,
      })
    );
  return featureCollection(points);
};
