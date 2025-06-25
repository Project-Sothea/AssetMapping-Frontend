import Mapbox, {
  Camera,
  Images,
  LocationPuck,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import { featureCollection, point } from '@turf/helpers';
import pin from '../assets/pin.png';
import homes from '~/data/homes.json';
import MapboxGL from '~/services/mapbox';

const mapStyleURL = MapboxGL.StyleURL.Outdoors;

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function Map() {
  const points = homes.map((home) => point([home.long, home.lat]));
  const homesFeatures = featureCollection(points);

  return (
    <MapView style={{ flex: 1 }} styleURL={mapStyleURL}>
      <Camera followUserLocation followZoomLevel={16}></Camera>
      <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />

      <ShapeSource id="houses" shape={homesFeatures}>
        <SymbolLayer
          id="homes-icons"
          style={{
            iconImage: 'pin',
            iconSize: 0.1,
          }}
        />
        <Images images={{ pin }} />
      </ShapeSource>
    </MapView>
  );
}
