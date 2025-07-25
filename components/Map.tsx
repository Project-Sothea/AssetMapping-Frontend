import 'react-native-get-random-values';
import { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';
import { View, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { PinFormValues } from './PinForm';
import { useFetchLocalPins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { PinFormModal } from './PinFormModal';
import { convertPinsToPointCollection } from '~/utils/Map/convertPinsToCollection';
import { PinDetailsModal } from './PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
import * as PinManager from '~/services/PinManager';
import { Pin } from '~/db/schema';
const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

export default function Map() {
  const { data: pins } = useFetchLocalPins();

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const screenIsFocused = useIsFocused();

  const handleDropPin = async (e: any) => {
    const [lng, lat] = (e.geometry as GeoJSON.Point).coordinates;

    if (lng && lat) {
      setDroppedCoords([lng, lat]);
      setModalVisible(true);
    }
  };

  const handlePinSubmit = async (PinformData: PinFormValues) => {
    if (droppedCoords == null) return;

    const lng = droppedCoords[0];
    const lat = droppedCoords[1];

    console.log('creating new pin in db...');
    try {
      await PinManager.createPin({ ...PinformData, lng, lat });

      Alert.alert(`Pin Created!`);

      setModalVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      console.error('Error uploading images or creating pin:', error);
      Alert.alert('Upload failed', 'Please try again.');
    }
  };

  const handlePinUpdate = async (PinformData: PinFormValues) => {};
  const handleOpenPin = async (e: any) => {
    const pressedFeature = e.features?.[0];
    if (pressedFeature) {
      const pinProps = pressedFeature.properties;
      setDetailsVisible(true);
      setSelectedPin(pinProps);
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

        {pins && (
          <ShapeSource
            id="pins"
            shape={convertPinsToPointCollection(pins)}
            onPress={handleOpenPin}
            cluster={false}>
            <SymbolLayer
              id="pin-icons"
              style={{
                iconImage: 'pin',
                iconSize: 0.05,
              }}
            />
            <Images images={{ pin }} />
          </ShapeSource>
        )}
      </MapView>

      {selectedPin && screenIsFocused && (
        <PinDetailsModal
          visible={detailsVisible}
          pin={selectedPin}
          onClose={() => {
            setSelectedPin(null);
            setDetailsVisible(false);
            console.log('closed pin');
          }}
          onUpdate={handlePinUpdate}
        />
      )}

      <PinFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setDroppedCoords(null);
        }}
        onSubmit={handlePinSubmit}
      />
    </View>
  );
}
