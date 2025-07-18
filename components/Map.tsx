import { Camera, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import { featureCollection, point } from '@turf/helpers';
import homes from '~/data/homes.json';
import MapboxGL from '~/services/mapbox';
import Form from './Form';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import type { Feature, FeatureCollection, Point } from 'geojson';
import { PinForm, PinFormValues } from './PinForm';
import { pin } from '~/apis';

const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

type PinProps = { id: string; name: string };
type Pin = Feature<Point, PinProps>;

export default function Map() {
  const points: Pin[] = homes.map(
    (pin) => point([pin.long, pin.lat], { id: pin.id, name: pin.name }) as Pin
  );
  const homesFeatures: FeatureCollection<Point, PinProps> = featureCollection(points);

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleDropPin = async (e: any) => {
    const [lng, lat] = (e.geometry as GeoJSON.Point).coordinates;

    if (lng && lat) {
      console.log('dropped', lng, lat);
      setDroppedCoords([lng, lat]);
      setModalVisible(true);
    }
  };

  const handleSubmit = (formData: PinFormValues) => {
    if (droppedCoords == null) {
      return;
    }
    console.log('creating new pin in db');

    const newPin = { ...formData, lng: droppedCoords[0], lat: droppedCoords[1] };
    pin.create(newPin);
    setModalVisible(false);
    setDroppedCoords(null);
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Pin</Text>

            <PinForm onSubmit={handleSubmit} />

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
