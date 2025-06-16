import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';

//mapbox://styles/mapbox/satellite-streets-v12
//16-18 zoom level
const mapStyleURL = MapboxGL.StyleURL.Satellite;

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function Map() {
  return (
    <MapView style={{ flex: 1 }} styleURL={mapStyleURL}>
      <Camera followUserLocation followZoomLevel={19}></Camera>
      <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />
    </MapView>
  );
}
