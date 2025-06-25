import Mapbox, { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import { featureCollection, point } from '@turf/helpers';
import pin from '~/assets/pin.png';
import homes from '~/data/homes.json';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function Map() {
  const points = homes.map((home) => point([home.long, home.lat]));
  const homesFeatures = featureCollection(points);

  return (
    <MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/satellite-streets-v12">
      <Camera followUserLocation followZoomLevel={16}></Camera>
      <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />
      
      <ShapeSource id = "houses" shape = {homesFeatures}>
        <SymbolLayer
          id = "homes-icons"
          style = {{
            iconImage: 'pin',
            iconSize: 0.5
          }}
        />
        <Images images = {{ pin }} />
      </ShapeSource>

    </MapView>
  );
}
