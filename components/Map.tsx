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
import Form from './Form';
import { View } from 'react-native';
import React, { useState } from 'react';
import PinDetails from './PinDetails';

const mapStyleURL = MapboxGL.StyleURL.Outdoors;

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_KEY || '');

export default function Map() {
  const points = homes.map((home) => point([home.long, home.lat]));
  const homesFeatures = featureCollection(points);

  const [droppedPins, setDroppedPins] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);


  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        onLongPress={(e) => { // set new pin on long press 
          const coords = (e.geometry as GeoJSON.Point).coordinates;
          const newPin = point(coords);
          setDroppedPins((prev) => [...prev, newPin]);
          setSelectedPin(newPin);
        }}
      >
        <Camera followUserLocation followZoomLevel={16} />
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

        <ShapeSource id="user-pins" shape={featureCollection(droppedPins)}>
          <SymbolLayer
            id="user-pins-layer"
            style={{
              iconImage: 'pin',
              iconSize: 0.1,
            }}
          />
        </ShapeSource>
      </MapView>

      {selectedPin && !isEditing && (
        <PinDetails
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
          onEdit={() => setIsEditing(true)}
        />
      )}

      {selectedPin && isEditing && (
        <Form
          pin={selectedPin}
          onClose={() => {
            setIsEditing(false);
            setSelectedPin(null);
          }}
        />
      )}

    </View>
  );
}