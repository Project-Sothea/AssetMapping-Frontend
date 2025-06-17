import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import { useState } from 'react';
import MapboxGL from '~/services/mapbox';

const mapStyleURL = MapboxGL.StyleURL.Satellite;

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function Map() {
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <MapView
      style={{ flex: 1 }}
      styleURL={mapStyleURL}
      onDidFinishLoadingMap={() => setMapLoaded(true)}>
      {mapLoaded && (
        <>
          <Camera followUserLocation followZoomLevel={18} />
          <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />
        </>
      )}
    </MapView>
  );
}
