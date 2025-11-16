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
import { useState, useEffect, useRef } from 'react';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import pin from '~/assets/pin.png';
import { PinFormModal } from './MapPin/PinFormModal';
import { convertPinsToPointCollection } from '~/features/pins/utils/convertPinsToCollection';
import { PinDetailsModal } from './MapPin/PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
import type { Pin } from '~/db/types';
import { MaterialIcons } from '@expo/vector-icons';
import { useCreatePin } from '~/features/pins/hooks/useCreatePin';
import { useUpdatePin } from '~/features/pins/hooks/useUpdatePin';
import { useDeletePin } from '~/features/pins/hooks/useDeletePin';
import { ReconnectButton } from '~/shared/components/ReconnectButton';

const MAP_STYLE_URL = MapboxGL.StyleURL.Outdoors;

type MapProps = {
  initialCoords?: { lat: number; lng: number };
  initialPinId?: string;
};

export default function Map({ initialCoords, initialPinId }: MapProps = {}) {
  const { data: pins } = useFetchLocalPins();
  const [mapKey, setMapKey] = useState(0);
  const cameraRef = useRef<Camera>(null);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [droppedCoords, setDroppedCoords] = useState<[number, number] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const screenIsFocused = useIsFocused();
  const { createPinAsync } = useCreatePin();
  const { updatePinAsync } = useUpdatePin();
  const { deletePinAsync } = useDeletePin();

  // Open initial pin and center camera if provided
  useEffect(() => {
    if (initialCoords) {
      // Add a small delay to ensure camera ref is ready
      const timer = setTimeout(() => {
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [initialCoords.lng, initialCoords.lat],
            zoomLevel: 18,
            animationDuration: 1000,
          });
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [initialCoords, initialPinId]);

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

    try {
      await createPinAsync(values);
      Alert.alert('Pin Created!');
      setModalVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      Alert.alert('Failed to create pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePinUpdate = async (values: any) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error updating pin');
      return;
    }

    try {
      await updatePinAsync({ id: values.id, updates: values });
      Alert.alert('Pin Updated!');
      setDetailsVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      Alert.alert('Failed to update pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDeletePin = async (pin: Pin) => {
    if (!pin.id) {
      Alert.alert('Error deleting pin');
      return;
    }

    try {
      await deletePinAsync(pin.id);
      Alert.alert('Pin Deleted!');
      setDetailsVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      Alert.alert('Failed to delete pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleOpenPin = async (e: any) => {
    const pressedFeature = e.features?.[0];
    if (pressedFeature) {
      const pinId = pressedFeature.properties?.id;
      if (!pinId) return;

      // Store pin ID - the modal will use live query to fetch and auto-update
      setSelectedPinId(pinId);
      setDetailsVisible(true);
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
        <Camera
          ref={cameraRef}
          followUserLocation={!initialCoords}
          followZoomLevel={!initialCoords ? 18 : undefined}
          defaultSettings={
            initialCoords
              ? {
                  centerCoordinate: [initialCoords.lng, initialCoords.lat],
                  zoomLevel: 18,
                }
              : undefined
          }
        />
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
                iconSize: 0.375,
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
                textOpacity: ['interpolate', ['linear'], ['zoom'], 9, 0, 10, 1],
              }}
            />
            <Images images={{ pin }} />
          </ShapeSource>
        )}
      </MapView>
      {selectedPinId && screenIsFocused && (
        <PinDetailsModal
          visible={detailsVisible}
          pinId={selectedPinId}
          onClose={() => {
            setSelectedPinId(null);
            setDetailsVisible(false);
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
      <View style={styles.reconnectButton}>
        <ReconnectButton />
      </View>
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
    padding: 12, // Increased padding to match reconnect button size
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },
  refreshText: {
    fontSize: 18,
  },
  reconnectButton: {
    position: 'absolute',
    bottom: 70, // Position above the refresh button
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 2, // Reduced padding to account for ReconnectButton's internal padding
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },
});
