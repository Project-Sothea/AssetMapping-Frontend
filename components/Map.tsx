import 'react-native-get-random-values';
import { Camera, Images, LocationPuck, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';
import { View, Alert } from 'react-native';
import { useState } from 'react';
import { PinFormValues } from './PinForm';
import { useFetchLocalPins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { PinFormModal } from './PinFormModal';
import { convertPinsToPointCollection } from '~/utils/Map/convertPinsToCollection';
import { PinDetailsModal } from './PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
// import * as PinManager from '~/services/PinManager';
import { Pin } from '~/db/schema';
import { PinManager } from '~/services/PinManager';
import { DrizzlePinRepo } from '~/services/sync/implementations/pins/DrizzlePinRepo';
import { pinSyncManager } from '~/services/sync/syncManagerInstance';
const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

const pinManager = new PinManager(new DrizzlePinRepo());

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

  const handlePinCreate = async (PinformData: PinFormValues) => {
    if (!PinformData.lat || !PinformData.lng) {
      Alert.alert('Error creating pin');
      return;
    }

    console.log('creating new pin in db...');
    try {
      await pinManager.createLocally(PinformData);
      await pinSyncManager.syncNow();
      Alert.alert(`Pin Created!`);
    } catch (error) {
      console.error('Error uploading images or creating pin:', error);
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setModalVisible(false);
      setDroppedCoords(null);
    }
  };

  const handlePinUpdate = async (PinformData: PinFormValues) => {
    if (!PinformData.lat || !PinformData.lng) {
      Alert.alert('Error updating pin');
      return;
    }
    console.log('updating pin in db...');
    console.log(PinformData);

    try {
      await pinManager.updateLocally(PinformData);
      await pinSyncManager.syncNow();

      Alert.alert(`Pin Updated!`);
    } catch (error) {
      console.error('Error updating images or creating pin:', error);
      Alert.alert('Save failed', 'Please try again.');
    } finally {
      setDetailsVisible(false);
      setDroppedCoords(null);
    }
  };

  const handleDeletePin = async (pin: Pin) => {
    if (!pin.id) {
      Alert.alert('Error deleting pin');
      return;
    }
    console.log('deleting pin in db...');

    try {
      await pinManager.deleteLocally(pin);
      await pinSyncManager.syncNow();

      Alert.alert(`Pin Deleted!`);
    } catch (error) {
      console.error('Error deleting pin:', error);
      Alert.alert('Delete failed', 'Please try again.');
    } finally {
      setDetailsVisible(false);
      setDroppedCoords(null);
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
          onDelete={handleDeletePin}
        />
      )}
      {droppedCoords && (
        <PinFormModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setDroppedCoords(null);
          }}
          onSubmit={handlePinCreate}
          coords={{ lng: droppedCoords[0], lat: droppedCoords[1] }}
        />
      )}
    </View>
  );
}
