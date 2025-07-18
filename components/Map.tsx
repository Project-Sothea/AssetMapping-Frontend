import Mapbox, {
  Camera,
  Images,
  LocationPuck,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import { featureCollection, point } from '@turf/helpers';
import homes from '~/data/homes.json';
import MapboxGL from '~/services/mapbox';
import Form from './Form';
import { View } from 'react-native';
import React, { useState } from 'react';
import type { Feature, FeatureCollection, Point } from 'geojson';

const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

type PinProps = { id: string; name: string };
type Pin = Feature<Point, PinProps>;

export default function Map() {
  const points: Pin[] = homes.map(
    (pin) => point([pin.long, pin.lat], { id: pin.id, name: pin.name }) as Pin
  );
  const homesFeatures: FeatureCollection<Point, PinProps> = featureCollection(points);

  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const handleDropPin = async (e: any) => {
    const [droppedCoords] = (e.geometry as GeoJSON.Point).coordinates;
    if (droppedCoords) {
      console.log('dropped', droppedCoords);
    }
  };

  const handleOpenPin = async (e: any) => {
    const pressedPin = e.features?.[0];
    if (pressedPin) {
      console.log('Pressed feature:', pressedPin);
      setSelectedPin(pressedPin);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={MAP_STYLE_URL}
        compassEnabled
        scaleBarEnabled
        onLongPress={handleDropPin}>
        <Camera followUserLocation followZoomLevel={16} />
        <LocationPuck puckBearingEnabled puckBearing="heading" pulsing={{ isEnabled: true }} />

        <ShapeSource id="houses" shape={homesFeatures} onPress={handleOpenPin}>
          <SymbolLayer
            id="homes-icons"
            style={{
              iconImage: 'pin',
              iconSize: 0.05,
            }}
          />
        </ShapeSource>
      </MapView>

      {selectedPin && <Form onClose={() => setSelectedPin(null)} />}
    </View>
  );
}
