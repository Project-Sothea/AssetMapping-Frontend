import 'react-native-get-random-values';
import {
  Camera,
  CircleLayer,
  Images,
  LocationPuck,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import MapboxGL from '~/services/mapbox';
import { View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useFetchLocalPins } from '~/hooks/Pins';
import pin from '~/assets/pin.png';
import { PinFormModal } from './MapPin/PinFormModal';
import { convertPinsToPointCollection } from '~/utils/Map/convertPinsToCollection';
import { PinDetailsModal } from './MapPin/PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
import { Pin } from '~/db/schema';
import { localPinRepo } from '~/services/sync/syncService';
import * as ImageManager from '~/services/sync/image/ImageManager';
import { MaterialIcons } from '@expo/vector-icons';

const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

export default function Map() {
  const { data: pins } = useFetchLocalPins();
  const [mapKey, setMapKey] = useState(0);

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const screenIsFocused = useIsFocused();

  const refreshMap = () => {
    setMapKey((k) => k + 1); // force remount
  };

  const handleDropPin = async (e: any) => {
    const [lng, lat] = (e.geometry as GeoJSON.Point).coordinates;

    if (lng && lat) {
      setDroppedCoords([lng, lat]);
      setModalVisible(true);
    }
  };

  const handlePinSubmit = async (values: any) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error creating pin');
      return;
    }

    console.log('creating new pin in db...');
    try {
      console.log('processing images...');
      if (values.localImages) {
        const { success: localURIs } = await ImageManager.saveToFileSystem(
          values.id,
          values.localImages
        );
        console.log('createLocally: localURIs', localURIs);
        await localPinRepo.create({
          ...values,
          localImages: JSON.stringify(localURIs),
          images: null,
        });
      } else {
        await localPinRepo.create(values);
      }
      Alert.alert(`Pin Created!`);
    } catch (error) {
      console.error('Error uploading images or creating pin:', error);
      Alert.alert('Upload failed', 'Please try again.');
    } finally {
      setModalVisible(false);
      setDroppedCoords(null);
    }
  };

  const handlePinUpdate = async (values: any) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error updating pin');
      return;
    }
    console.log('updating pin in db...');

    try {
      console.log('processing images...');
      if (values.localImages) {
        const currPin = await localPinRepo.get(values.id);
        const currLocalImages: string[] = currPin.localImages
          ? JSON.parse(currPin.localImages)
          : [];

        const { success: localURIs } = await ImageManager.updateImagesLocally(
          values.id,
          values.localImages,
          currLocalImages
        );
        console.log('createLocally: localURIs', localURIs);
        await localPinRepo.update({
          ...values,
          localImages: JSON.stringify(localURIs),
          images: null,
        });
      } else {
        await localPinRepo.update(values);
      }
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
      await localPinRepo.delete(pin.id);
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
        key={mapKey}
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
            cluster>
            <SymbolLayer
              id="pointCount"
              style={{
                textField: ['get', 'point_count'],
                textSize: 50,
                textColor: 'white',
                textPitchAlignment: 'map',
              }}
            />
            <CircleLayer
              id="clusters"
              belowLayerID="pointCount"
              filter={['has', 'point_count']}
              style={{
                circlePitchAlignment: 'map',
                circleColor: 'red',
                circleRadius: 60,
                circleOpacity: 0.6,
                circleStrokeWidth: 2,
                circleStrokeColor: 'white',
              }}
            />
            <SymbolLayer
              id="pin-icons"
              filter={['!', ['has', 'point_count']]}
              style={{
                iconImage: 'pin',
                iconSize: 0.075,
                iconAllowOverlap: true,
              }}
            />
            <SymbolLayer
              id="pin-labels"
              filter={['!', ['has', 'point_count']]}
              style={{
                textField: ['get', 'name'],
                textFont: ['Open Sans Bold'],
                textSize: 14,
                textColor: '#111',
                textHaloColor: '#fff',
                textHaloWidth: 1.6,
                textHaloBlur: 0.5,
                textAnchor: 'bottom',
                textOffset: [0, -2.5], // shift higher above pin
                textAllowOverlap: false,
                textOpacity: ['interpolate', ['linear'], ['zoom'], 9, 0, 10, 1]
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
          onSubmit={handlePinSubmit}
          coords={{ lng: droppedCoords[0], lat: droppedCoords[1] }}
        />
      )}
      <TouchableOpacity style={styles.refreshButton} onPress={refreshMap}>
        <MaterialIcons name="refresh" color="black" size={30} style={styles.refreshText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  refreshButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },
  refreshText: {
    fontSize: 18,
  },
});
