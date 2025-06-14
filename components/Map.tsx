import Mapbox, { Camera, LocationPuck, MapView } from '@rnmapbox/maps';

const accessToken =
  'pk.eyJ1IjoicHJvamVjdHNvdGhlYSIsImEiOiJjbWJzbjVxZngwbmZuMm5vZ3h0eXBnYnlrIn0.Ro_wtGTUXWsJ2cfjNdQ1iw';
Mapbox.setAccessToken(accessToken);
export default function Map() {
  return (
    <MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/satellite-streets-v12">
      <Camera followUserLocation></Camera>
      <LocationPuck />
    </MapView>
  );
}
