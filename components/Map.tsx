import Mapbox, { Camera, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import { useState } from 'react';
import MapboxGL from '~/services/mapbox';
import { polygon } from '@turf/helpers';
import { coordsSreO } from '~/data/testingData';

const mapStyleURL = MapboxGL.StyleURL.SatelliteStreet;

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function Map() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const poly = polygon([
    [
      [coordsSreO.minLng, coordsSreO.minLat], // bottom-left
      [coordsSreO.maxLng, coordsSreO.minLat], // bottom-right
      [coordsSreO.maxLng, coordsSreO.maxLat], // top-right
      [coordsSreO.minLng, coordsSreO.maxLat], // top-left
      [coordsSreO.minLng, coordsSreO.minLat], // close loop
    ],
  ]);

  return (
    <MapView
      style={{ flex: 1 }}
      styleURL={mapStyleURL}
      onDidFinishLoadingMap={() => setMapLoaded(true)}>
      {mapLoaded && (
        <>
          <Camera followUserLocation followZoomLevel={16} />
          <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />
          <ShapeSource id="OfflineRegion" shape={poly}>
            <MapboxGL.FillLayer id="offlineFill" style={{ fillColor: 'rgba(0, 150, 255, 0.2)' }} />
            <MapboxGL.LineLayer id="offlineBorder" style={{ lineColor: '#007AFF', lineWidth: 2 }} />
          </ShapeSource>
        </>
      )}
    </MapView>
  );
}
