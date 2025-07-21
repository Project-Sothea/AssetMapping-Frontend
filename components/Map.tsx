import 'react-native-get-random-values';
import { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';
import { View, Alert } from 'react-native';
import { useState } from 'react';
import { PinFormValues } from './PinForm';
import { useInsertPin, useFetchPins, useFetchLivePins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { uploadImageAsync } from '~/utils/Map/uploadImageAsync';
import { v4 as uuidv4 } from 'uuid';
import { PinFormModal } from './PinFormModal';
import { convertPinsToPointCollection } from '~/utils/Map/convertPinsToCollection';
import { Pin } from '~/utils/globalTypes';
import { PinDetailsModal } from './PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

export default function Map() {
  const { data: livePins } = useFetchLivePins();
  const { data: pins = [], isLoading } = useFetchPins();
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const pointCollection = convertPinsToPointCollection(pins);
  const insertPin = useInsertPin();
  const screenIsFocused = useIsFocused();

  // console.log(livePins);
  const handleDropPin = async (e: any) => {
    const [lng, lat] = (e.geometry as GeoJSON.Point).coordinates;

    if (lng && lat) {
      setDroppedCoords([lng, lat]);
      setModalVisible(true);
    }
  };

  const handlePinSubmit = async (formData: PinFormValues) => {
    if (droppedCoords == null) return;

    console.log('creating new pin in db...');
    try {
      const uuid = uuidv4();
      const uploadedImageUrls = await Promise.all(
        formData.images.map((image, idx) => {
          const filename = `${uuid}/${Date.now()}-${idx}.jpg`;
          return uploadImageAsync(image.uri, filename);
        })
      );
      const newPin = {
        ...formData,
        lng: droppedCoords[0],
        lat: droppedCoords[1],
        images: uploadedImageUrls,
        id: uuid,
      };

      insertPin.mutate(newPin);
      Alert.alert(`${newPin.name} Pin Created!`);
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
