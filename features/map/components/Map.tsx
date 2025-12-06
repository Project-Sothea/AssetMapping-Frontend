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
import { convertPinsToPointCollection } from '~/features/pins/utils/convertPinsToCollection';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ReconnectButton } from '~/shared/components/ReconnectButton';
import { PinModal } from '../../pins/components/PinModal';

// Default style; can be toggled at runtime
const DEFAULT_STYLE_URL = MapboxGL.StyleURL.SatelliteStreet;

type MapProps = {
  initialCoords?: { lat: number; lng: number };
  initialPinId?: string;
};

type PinModalState =
  | { mode: 'create'; coords: [number, number] }
  | { mode: 'view'; pinId: string }
  | null;

export default function Map({ initialCoords, initialPinId }: MapProps = {}) {
  const { data: pins } = useFetchLocalPins();
  const [mapKey, setMapKey] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const [styleUrl, setStyleUrl] = useState<string>(DEFAULT_STYLE_URL);

  const [pinModalState, setPinModalState] = useState<PinModalState>(null);

  const screenIsFocused = useIsFocused();

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

  useEffect(() => {
    const setupLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }

        MapboxGL.locationManager.start();
      } catch (e) {
        console.warn('Failed to start Mapbox location manager', e);
      }
    };

    setupLocation();

    return () => {
      MapboxGL.locationManager.stop();
    };
  }, []);

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
      setPinModalState({ mode: 'create', coords: [lng, lat] });
    }
  };

  const handleCenterOnUser = async () => {
    try {
      const loc = await MapboxGL.locationManager.getLastKnownLocation();
      const coords = loc?.coords;
      console.log('📍 User location coords:', coords);
      if (!coords) {
        Alert.alert(
          'Location not ready',
          'We are still getting your location. Please try again in a few seconds.'
        );
        return;
      }

      cameraRef.current?.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 16,
        animationDuration: 600,
      });
    } catch (error) {
      console.warn('⚠️ Failed to center on user location', error);
      Alert.alert('Location unavailable', 'Unable to access your current location.');
    }
  };

  const handleOpenPin = async (event: OnPressEvent) => {
    const pressedFeature = event.features[0];
    if (pressedFeature?.properties) {
      const pinId = pressedFeature.properties.id as string | undefined;
      if (!pinId) return;

      setPinModalState({ mode: 'view', pinId });
    }
  };

  const handleCloseModal = () => setPinModalState(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        key={mapKey}
        style={{ flex: 1 }}
        styleURL={styleUrl}
        compassEnabled
        scaleBarEnabled
        onLongPress={handleDropPin}>
        <Camera ref={cameraRef} />
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
      {pinModalState?.mode === 'view' && screenIsFocused && (
        <PinModal mode="view" visible pinId={pinModalState.pinId} onClose={handleCloseModal} />
      )}
      {pinModalState?.mode === 'create' && (
        <PinModal
          mode="create"
          visible
          coords={{ lng: pinModalState.coords[0], lat: pinModalState.coords[1] }}
          onClose={handleCloseModal}
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
