import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');
export default function Map() {
  return (
    <MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/satellite-streets-v12">
      <Camera followUserLocation followZoomLevel={16}></Camera>
      <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />
    </MapView>
  );
}
