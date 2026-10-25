import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import Map from './Map';

jest.mock('react-native-get-random-values', () => ({}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('@rnmapbox/maps', () => ({
  Camera: 'Camera',
  CircleLayer: 'CircleLayer',
  Images: 'Images',
  LocationPuck: 'LocationPuck',
  MapView: 'MapView',
  ShapeSource: 'ShapeSource',
  SymbolLayer: 'SymbolLayer',
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
}));
jest.mock('~/services/mapbox', () => ({
  __esModule: true,
  default: {
    StyleURL: { Street: 'streets', SatelliteStreet: 'satellite', Outdoors: 'outdoors' },
    locationManager: { stop: jest.fn() },
  },
}));
jest.mock('~/features/pins/hooks/useFetchPins', () => ({ useFetchLocalPins: () => [] }));
jest.mock('~/shared/components/ReconnectButton', () => ({ ReconnectButton: () => null }));
jest.mock('../../pins/components/PinModal', () => ({ PinModal: () => null }));

let renderer: ReactTestRenderer;
beforeEach(async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await act(async () => {
    renderer = create(<Map />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.restoreAllMocks();
});
const mapView = () => renderer.root.findByType('MapView' as any);

test('opens Satellite Streets and limits extreme zoom', () => {
  expect(mapView().props.styleURL).toBe('satellite');
  expect(renderer.root.findByType('Camera' as any).props.maxZoomLevel).toBe(20);
});

test('a map loading failure exposes recovery without removing the map or controls', async () => {
  expect(typeof mapView().props.onMapLoadingError).toBe('function');
  await act(async () => mapView().props.onMapLoadingError());
  expect(
    renderer.root.findAllByType(Text).some((node) => node.props.children === 'Map could not load')
  ).toBe(true);
  expect(mapView()).toBeTruthy();
  const before = renderer.root.findByType('Camera' as any);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Reload map' }).props.onPress();
  });
  expect(renderer.root.findByType('Camera' as any)).not.toBe(before);
  expect(renderer.root.findAllByType(TouchableOpacity).length).toBeGreaterThan(0);
});

test('layer control switches to Streets and back to Satellite Streets', async () => {
  await act(async () => {
    renderer.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.findAllByProps({ name: 'layers' }).length > 0)!
      .props.onPress();
  });
  expect(mapView().props.styleURL).toBe('streets');
  await act(async () => {
    renderer.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.findAllByProps({ name: 'layers' }).length > 0)!
      .props.onPress();
  });
  expect(mapView().props.styleURL).toBe('satellite');
});

test('satellite failures can fall back to the downloaded Streets style', async () => {
  await act(async () => mapView().props.onMapLoadingError());
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Use downloaded street map' }).props.onPress();
  });
  expect(mapView().props.styleURL).toBe('streets');
});
