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
import type { OnPressEvent } from '@rnmapbox/maps/lib/typescript/src/types/OnPressEvent';
import * as Location from 'expo-location';
import type { Feature, Geometry } from 'geojson';
import { useState, useEffect, useRef } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet } from 'react-native';

import pin from '~/assets/pin.png';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import { convertPinsToPointCollection } from '~/features/pins/utils/convertPinsToCollection';
import MapboxGL from '~/services/mapbox';
import { ReconnectButton } from '~/shared/components/ReconnectButton';

import { PinModal } from '../../pins/components/PinModal';

// Default style; can be toggled at runtime
const DEFAULT_STYLE_URL = MapboxGL.StyleURL.SatelliteStreet;

type MapProps = {
  initialCoords?: { lat: number; lng: number };
};

const DEFAULT_COORDS = { lat: 12.794459, lng: 103.308443 };
const DEFAULT_ZOOM = 10;
const PIN_ZOOM = 18;

type PinModalState =
  | { mode: 'create'; coords: [number, number] }
  | { mode: 'view'; pin: Pin }
  | null;

export default function Map({ initialCoords }: MapProps = {}) {
  const pins = useFetchLocalPins();
  const [mapKey, setMapKey] = useState(0);
  const cameraRef = useRef<Camera>(null);
  const [styleUrl, setStyleUrl] = useState<string>(DEFAULT_STYLE_URL);

  const [pinModalState, setPinModalState] = useState<PinModalState>(null);

  const screenIsFocused = useIsFocused();
  const targetCoords = initialCoords ?? DEFAULT_COORDS;

  // Open initial pin and center camera if provided
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cameraRef.current && targetCoords.lng && targetCoords.lat) {
        cameraRef.current.setCamera({
          centerCoordinate: [targetCoords.lng, targetCoords.lat],
          zoomLevel: initialCoords ? PIN_ZOOM : DEFAULT_ZOOM,
          animationDuration: 1000,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [initialCoords, targetCoords.lng, targetCoords.lat]);

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
        compassEnabled
        scaleBarEnabled
        onLongPress={handleDropPin}>
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [targetCoords.lng, targetCoords.lat],
            zoomLevel: initialCoords ? PIN_ZOOM : DEFAULT_ZOOM,
          }}
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
