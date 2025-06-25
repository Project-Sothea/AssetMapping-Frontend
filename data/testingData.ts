import { offlineManager } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';

type UseCreatePackProps = Parameters<typeof offlineManager.createPack>[0];

export const coordsSreO = {
  maxLat: 12.83,
  minLat: 12.827,
  maxLng: 103.3915,
  minLng: 103.389,
};

export const packSreO: UseCreatePackProps = {
  name: 'Sre O Primary School',
  styleURL: MapboxGL.StyleURL.SatelliteStreet,
  bounds: [
    [coordsSreO.maxLng, coordsSreO.maxLat],
    [coordsSreO.minLng, coordsSreO.minLat],
  ],
  minZoom: 16,
  maxZoom: 22,
};

/*
    [103.920438, 1.328571],
    [103.90131, 1.314171],

    [1.323406, 103.917268],
    [1.322490, 103.916605]

    //sre o
    [12.830381, 103.3883592], //lat, long
    [12.8282439, 103.388317], //lat, long
*/
