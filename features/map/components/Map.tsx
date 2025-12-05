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
import type { OnPressEvent } from '@rnmapbox/maps/lib/typescript/src/types/OnPressEvent';
import type { Feature, Geometry } from 'geojson';
import MapboxGL from '~/services/mapbox';
import { View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import pin from '~/assets/pin.png';
import { PinFormModal } from './PinFormModal';
import { convertPinsToPointCollection } from '~/features/pins/utils/convertPinsToCollection';
import { PinDetailsModal } from './PinDetailsModal';
import { useIsFocused } from '@react-navigation/native';
import type { Pin } from '~/db/schema';
import { MaterialIcons } from '@expo/vector-icons';
import { useCreatePin } from '~/features/pins/hooks/useCreatePin';
import { useUpdatePin } from '~/features/pins/hooks/useUpdatePin';
import { useDeletePin } from '~/features/pins/hooks/useDeletePin';
import { ReconnectButton } from '~/shared/components/ReconnectButton';
import type { PinFormValues } from './PinForm';

// Default style; can be toggled at runtime
const DEFAULT_STYLE_URL = MapboxGL.StyleURL.SatelliteStreet;

type MapProps = {
  initialCoords?: { lat: number; lng: number };
  initialPinId?: string;
};

export default function Map({ initialCoords, initialPinId }: MapProps = {}) {
  const { data: pins } = useFetchLocalPins();
  const [mapKey, setMapKey] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const [styleUrl, setStyleUrl] = useState<string>(DEFAULT_STYLE_URL);

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

  const toggleStyle = () => {
    setStyleUrl((prev) =>
      prev === MapboxGL.StyleURL.SatelliteStreet
        ? MapboxGL.StyleURL.Outdoors
        : MapboxGL.StyleURL.SatelliteStreet
    );
  };

  const handleDropPin = async (feature: Feature<Geometry>) => {
    // Type guard to ensure it's a Point geometry
    if (feature.geometry.type !== 'Point') return;

    const [lng, lat] = feature.geometry.coordinates;

    if (lng && lat) {
      setDroppedCoords([lng, lat]);
      setModalVisible(true);
    }
  };

  const handlePinSubmit = async (values: PinFormValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error creating pin');
      return;
    }

    try {
      // Convert PinFormValues to Pin format
      const pinData: Pin = {
        id: values.id,
        name: values.name,
        cityVillage: values.cityVillage,
        address: values.address,
        description: values.description,
        type: values.type,
        lat: values.lat,
        lng: values.lng,
        images: values.images || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        status: 'unsynced',
      };
      console.log('📤 Creating pin with data:', pinData);
      await createPinAsync(pinData);
      Alert.alert('Pin Created!');
      setModalVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      Alert.alert('Failed to create pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handlePinUpdate = async (values: PinFormValues) => {
    if (!values.lat || !values.lng) {
      Alert.alert('Error updating pin');
      return;
    }

    try {
      // Simple update - just pass the changed fields
      await updatePinAsync({
        id: values.id,
        updates: {
          name: values.name,
          cityVillage: values.cityVillage,
          address: values.address,
          description: values.description,
          type: values.type,
          lat: values.lat,
          lng: values.lng,
          images: values.images || [], // Store filenames
        },
      });
      Alert.alert('Pin Updated!');
      setDetailsVisible(false);
      setDroppedCoords(null);
    } catch (error) {
      Alert.alert('Failed to update pin', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCenterOnUser = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = loc?.coords;
      if (!coords) {
        Alert.alert('Location unavailable', 'Unable to access your current location.');
        return;
      }
      cameraRef.current?.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 16,
        animationDuration: 800,
      });
    } catch (error) {
      console.warn('⚠️ Failed to center on user location', error);
      Alert.alert('Location unavailable', 'Unable to access your current location.');
    }
  };

  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ Location permission not granted');
        }
      } catch (error) {
        console.warn('⚠️ Failed to request location permission', error);
      }
    };
    requestLocationPermission();
  }, []);

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

  const handleOpenPin = async (event: OnPressEvent) => {
    const pressedFeature = event.features[0];
    if (pressedFeature?.properties) {
      const pinId = pressedFeature.properties.id as string | undefined;
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
        styleURL={styleUrl}
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
        <Images images={{ pin }} />
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
                iconSize: 0.18,
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
      <TouchableOpacity style={[styles.refreshButton, { right: 60 }]} onPress={toggleStyle}>
        <MaterialIcons name="satellite" color="black" size={30} style={styles.refreshText} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.refreshButton, { right: 110 }]} onPress={handleCenterOnUser}>
        <MaterialIcons name="my-location" color="black" size={24} style={styles.refreshText} />
      </TouchableOpacity>

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
