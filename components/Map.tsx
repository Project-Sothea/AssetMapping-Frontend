import 'react-native-get-random-values';
import { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';
import { View, Alert } from 'react-native';
import { useState } from 'react';
import { PinFormValues } from './PinForm';
import { useInsertPin, useFetchActivePins, useFetchLivePins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { PinFormModal } from './PinFormModal';
import { convertPinsToPointCollection } from '~/utils/Map/convertPinsToCollection';
import { RePin } from '~/utils/globalTypes';
import { PinDetailsModal } from './PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

export default function Map() {
  const { data: livePins } = useFetchLivePins();
  const { data: pins = [], isLoading, isFetching } = useFetchActivePins();

  const [selectedPin, setSelectedPin] = useState<RePin | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // console.log('isFetching:', isFetching);
  // console.log(livePins ? 'livePins exist' : 'livePins d.n.e');
  const pointCollection = convertPinsToPointCollection(pins);
  const insertPin = useInsertPin();
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
      insertPin.mutate({ ...PinformData, lng, lat });

      Alert.alert(`Pin Created!`);

      setModalVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      console.error('Error uploading images or creating pin:', error);
      Alert.alert('Upload failed', 'Please try again.');
    }
  };

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

        {!isLoading && (
          <ShapeSource id="houses" shape={pointCollection} onPress={handleOpenPin}>
            <SymbolLayer
              id="homes-icons"
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
