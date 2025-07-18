import 'react-native-get-random-values';
import { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import { featureCollection, point } from '@turf/helpers';
import MapboxGL from '~/services/mapbox';
import Form from './Form';
import { Modal, TouchableOpacity, View, Text, StyleSheet, Alert } from 'react-native';
import { useState } from 'react';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { PinForm, PinFormValues } from './PinForm';
import { useCreatePin, useFetchPins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { uploadImageAsync } from '~/utils/Map/uploadImageAsync';
import { v4 as uuidv4 } from 'uuid';

const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

type PinProps = { id: string; name: string };
type PinFeature = Feature<Point, PinProps>;

export default function Map() {
  const { data: pins = [], isLoading } = useFetchPins();
  const createPin = useCreatePin();

  const points: PinFeature[] = pins.map((pin) =>
    point([pin.lng, pin.lat], { id: pin.id, name: pin.name })
  );
  const pointCollection: FeatureCollection<Point, PinProps> = featureCollection(points);

  const [selectedPin, setSelectedPin] = useState<PinFeature | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

      createPin.mutate(newPin);
      Alert.alert(`${newPin.name} Pin Created!`);
      setModalVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      console.error('Error uploading images or creating pin:', error);
      Alert.alert('Upload failed', 'Please try again.');
    }
  };

  const handleOpenPin = async (e: any) => {
    const pressedPin = e.features?.[0];
    if (pressedPin) {
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

      {selectedPin && <Form onClose={() => setSelectedPin(null)} />}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Pin</Text>

            <PinForm onSubmit={handlePinSubmit} />

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={{ color: 'white' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // semi-transparent dark background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '90%',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#cc0000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
});
