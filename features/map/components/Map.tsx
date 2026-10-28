import 'react-native-get-random-values';
import type { Pin } from '@assetmapping/shared-types';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import {
  Camera,
  CircleLayer,
  Images,
  LocationPuck,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import * as Location from 'expo-location';
import type { Feature } from 'geojson';
import { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, View, Text, Alert, TouchableOpacity, StyleSheet } from 'react-native';

import pin from '~/assets/pin.png';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import { convertPinsToPointCollection } from '~/features/pins/utils/convertPinsToCollection';
import MapboxGL from '~/services/mapbox';
import { ReconnectButton } from '~/shared/components/ReconnectButton';

import { PinModal } from '../../pins/components/PinModal';

// Default style; can be toggled at runtime
const DEFAULT_STYLE_URL = MapboxGL.StyleURL.SatelliteStreet;
// Existing offline packs contain Streets, not satellite imagery.
const OFFLINE_STYLE_URL = MapboxGL.StyleURL.Street;

type MapProps = {
  initialCoords?: { lat: number; lng: number };
  onInitialCoordsHandled?: () => void;
};

const DEFAULT_COORDS = { lat: 12.794459, lng: 103.308443 };
const DEFAULT_ZOOM = 10;
const PIN_ZOOM = 18;
const MAX_ZOOM = 20;

type PinModalState =
  | { mode: 'create'; coords: [number, number] }
  | { mode: 'view'; pin: Pin }
  | null;

export default function Map({ initialCoords, onInitialCoordsHandled }: MapProps = {}) {
  const pins = useFetchLocalPins();
  const pinCollection = useMemo(() => convertPinsToPointCollection(pins), [pins]);
  const [mapKey, setMapKey] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const [styleUrl, setStyleUrl] = useState<string>(DEFAULT_STYLE_URL);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  const [pinModalState, setPinModalState] = useState<PinModalState>(null);

  const screenIsFocused = useIsFocused();
  const savedCamera = useRef({
    centerCoordinate: [
      (initialCoords ?? DEFAULT_COORDS).lng,
      (initialCoords ?? DEFAULT_COORDS).lat,
    ],
    zoomLevel: initialCoords ? PIN_ZOOM : DEFAULT_ZOOM,
  });

  // Open initial pin and center camera if provided
  useEffect(() => {
    if (!initialCoords) return;
    const timer = setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [initialCoords.lng, initialCoords.lat],
          zoomLevel: PIN_ZOOM,
          animationDuration: 1000,
        });
        onInitialCoordsHandled?.();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [initialCoords, onInitialCoordsHandled]);

  useEffect(() => {
    if (!screenIsFocused) return;
    let active = true;
    const setupLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }

        if (active) MapboxGL.locationManager.start();
      } catch (e) {
        console.warn('Failed to start Mapbox location manager', e);
      }
    };

    setupLocation();

    return () => {
      active = false;
      MapboxGL.locationManager.stop();
    };
  }, [screenIsFocused]);

  // Recreate the native map surface after the app resumes from the background.
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active' && screenIsFocused) {
        setMapKey((key) => key + 1);
      }
      previousState = nextState;
    });

    return () => subscription.remove();
  }, [screenIsFocused]);

  const refreshMap = () => {
    setMapLoadFailed(false);
    setMapKey((k) => k + 1); // force remount
  };

  const toggleStyle = () => {
    setStyleUrl((prev) => (prev === DEFAULT_STYLE_URL ? OFFLINE_STYLE_URL : DEFAULT_STYLE_URL));
    setMapLoadFailed(false);
  };

  const handleDropPin = async (feature: Feature) => {
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

  const handleOpenPin = async (event: { features: Feature[] }) => {
    const pressedFeature = event.features[0];
    if (pressedFeature?.properties) {
      const pinId = pressedFeature.properties.id as string | undefined;
      if (!pinId) return;
      const pinData = pins?.find((p) => p.id === pinId);
      if (!pinData) return;
      setPinModalState({ mode: 'view', pin: pinData });
    }
  };

  const handleCloseModal = () => setPinModalState(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        key={mapKey}
        style={{ flex: 1 }}
        styleURL={styleUrl}
        onCameraChanged={(event) => {
          savedCamera.current = {
            centerCoordinate: event.properties.center,
            zoomLevel: event.properties.zoom,
          };
        }}
        compassEnabled
        scaleBarEnabled
        onMapLoadingError={() => {
          console.warn('Map loading failed', { styleUrl, maxZoom: MAX_ZOOM });
          setMapLoadFailed(true);
        }}
        onDidFinishRenderingMapFully={() => setMapLoadFailed(false)}
        onLongPress={handleDropPin}>
        <Camera ref={cameraRef} maxZoomLevel={MAX_ZOOM} defaultSettings={savedCamera.current} />
        <LocationPuck
          visible={screenIsFocused}
          puckBearingEnabled={screenIsFocused}
          puckBearing="heading"
          pulsing={{ isEnabled: screenIsFocused }}
        />
        <Images images={{ pin }} />
        {pins && (
          <ShapeSource id="pins" shape={pinCollection} onPress={handleOpenPin} cluster>
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
      {mapLoadFailed && (
        <View style={styles.mapError} accessibilityLiveRegion="polite">
          <Text>Map could not load</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reload map"
            onPress={refreshMap}>
            <MaterialIcons name="refresh" color="black" size={24} />
          </TouchableOpacity>
          {styleUrl !== OFFLINE_STYLE_URL && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Use downloaded street map"
              onPress={() => {
                setStyleUrl(OFFLINE_STYLE_URL);
                refreshMap();
              }}>
              <MaterialIcons name="map" color="black" size={24} />
            </TouchableOpacity>
          )}
        </View>
      )}
      {pinModalState?.mode === 'view' && screenIsFocused && (
        <PinModal mode="view" visible pin={pinModalState.pin} onClose={handleCloseModal} />
      )}
      {pinModalState?.mode === 'create' && (
        <PinModal
          mode="create"
          visible
          coords={{ lng: pinModalState.coords[0], lat: pinModalState.coords[1] }}
          onClose={handleCloseModal}
        />
      )}
      <View style={styles.controlsLeft}>
        <TouchableOpacity style={styles.controlButton} onPress={refreshMap}>
          <MaterialIcons name="refresh" color="black" size={24} />
        </TouchableOpacity>
        <View style={styles.controlButton}>
          <ReconnectButton />
        </View>
      </View>

      <View style={styles.controlsRight}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleStyle}>
          <MaterialIcons name="layers" color="black" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleCenterOnUser}>
          <MaterialIcons name="my-location" color="black" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapError: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlsLeft: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    gap: 10,
  },
  controlsRight: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    gap: 10,
  },
  controlButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },
});
