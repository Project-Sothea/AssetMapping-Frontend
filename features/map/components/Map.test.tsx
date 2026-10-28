import React from 'react';
import { AppState, Text, TouchableOpacity, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import Map from './Map';

jest.mock('react-native-get-random-values', () => ({}));
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
const mockSetCamera = jest.fn();
const mockRequestPermission = jest.fn();
const mockStartLocation = jest.fn();
const mockStopLocation = jest.fn();
let mockFocused = true;

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('@rnmapbox/maps', () => ({
  Camera: (() => {
    const React = jest.requireActual<typeof import('react')>('react');
    return React.forwardRef<{ setCamera: typeof mockSetCamera }, Record<string, unknown>>(
      function Camera(props, ref) {
        React.useImperativeHandle(ref, () => ({ setCamera: mockSetCamera }), []);
        return React.createElement('Camera', props);
      }
    );
  })(),
  CircleLayer: 'CircleLayer',
  Images: 'Images',
  LocationPuck: 'LocationPuck',
  MapView: 'MapView',
  ShapeSource: 'ShapeSource',
  SymbolLayer: 'SymbolLayer',
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => mockRequestPermission(),
}));
jest.mock('~/services/mapbox', () => ({
  __esModule: true,
  default: {
    StyleURL: { Street: 'streets', SatelliteStreet: 'satellite', Outdoors: 'outdoors' },
    locationManager: { start: () => mockStartLocation(), stop: () => mockStopLocation() },
  },
}));
jest.mock('~/features/pins/hooks/useFetchPins', () => ({ useFetchLocalPins: () => [] }));
jest.mock('~/shared/components/ReconnectButton', () => ({ ReconnectButton: () => null }));
jest.mock('../../pins/components/PinModal', () => ({ PinModal: () => null }));

let renderer: ReactTestRenderer;
let appStateListeners: Set<(state: AppStateStatus) => void>;
const appStateRemovals: jest.Mock[] = [];
beforeEach(async () => {
  jest.clearAllMocks();
  mockFocused = true;
  mockRequestPermission.mockResolvedValue({ status: 'denied' });
  appStateListeners = new Set();
  appStateRemovals.length = 0;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.add(listener);
    const remove = jest.fn(() => appStateListeners.delete(listener));
    appStateRemovals.push(remove);
    return { remove };
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await act(async () => {
    renderer = create(<Map />);
  });
});
afterEach(async () => {
  await act(async () => renderer.unmount());
  jest.useRealTimers();
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

test('camera position survives native map reload and a focused background/resume cycle', async () => {
  const position = { center: [103.22, 12.72], zoom: 17.25 };
  await act(async () => mapView().props.onCameraChanged({ properties: position }));
  const beforeReload = mapView();
  await act(async () => {
    renderer.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.findAllByProps({ name: 'refresh' }).length > 0)!
      .props.onPress();
  });
  expect(mapView()).not.toBe(beforeReload);
  expect(renderer.root.findByType('Camera' as any).props.defaultSettings).toEqual({
    centerCoordinate: position.center,
    zoomLevel: position.zoom,
  });
  const beforeResume = mapView();
  await act(async () => {
    appStateListeners.forEach((listener) => listener('background'));
    appStateListeners.forEach((listener) => listener('active'));
  });
  expect(mapView()).not.toBe(beforeResume);
  expect(renderer.root.findByType('Camera' as any).props.defaultSettings).toEqual({
    centerCoordinate: position.center,
    zoomLevel: position.zoom,
  });
});

test('an unfocused map does not recreate its native surface on app resume', async () => {
  mockFocused = false;
  await act(async () => renderer.update(<Map />));
  const before = mapView();
  await act(async () => {
    appStateListeners.forEach((listener) => listener('background'));
    appStateListeners.forEach((listener) => listener('active'));
  });
  expect(mapView()).toBe(before);
  expect(renderer.root.findByType('LocationPuck' as any).props.visible).toBe(false);
  expect(appStateListeners.size).toBe(1);
  expect(appStateRemovals[0]).toHaveBeenCalledTimes(1);
});

test('route coordinates center once and acknowledge completion without recentering after removal', async () => {
  jest.useFakeTimers();
  const handled = jest.fn();
  const coords = { lat: 12.71, lng: 103.21 };
  await act(async () => {
    renderer.update(<Map initialCoords={coords} onInitialCoordsHandled={handled} />);
  });
  expect(mockSetCamera).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(300));
  expect(mockSetCamera).toHaveBeenCalledWith({
    centerCoordinate: [coords.lng, coords.lat],
    zoomLevel: 18,
    animationDuration: 1000,
  });
  expect(handled).toHaveBeenCalledTimes(1);
  await act(async () => renderer.update(<Map onInitialCoordsHandled={handled} />));
  await act(async () => jest.advanceTimersByTime(1000));
  expect(mockSetCamera).toHaveBeenCalledTimes(1);
});

test('superseded route coordinates cancel their pending camera request', async () => {
  jest.useFakeTimers();
  const oldHandled = jest.fn();
  const newHandled = jest.fn();
  await act(async () => {
    renderer.update(<Map initialCoords={{ lat: 1, lng: 2 }} onInitialCoordsHandled={oldHandled} />);
  });
  await act(async () => jest.advanceTimersByTime(100));
  await act(async () => {
    renderer.update(<Map initialCoords={{ lat: 3, lng: 4 }} onInitialCoordsHandled={newHandled} />);
  });
  await act(async () => jest.advanceTimersByTime(300));
  expect(oldHandled).not.toHaveBeenCalled();
  expect(newHandled).toHaveBeenCalledTimes(1);
  expect(mockSetCamera).toHaveBeenCalledTimes(1);
  expect(mockSetCamera.mock.calls[0][0].centerCoordinate).toEqual([4, 3]);
});

test('granted location starts only while focused and a delayed permission cannot restart it after blur', async () => {
  mockFocused = false;
  await act(async () => renderer.update(<Map />));
  let finishPermission!: (value: { status: string }) => void;
  mockRequestPermission.mockImplementationOnce(
    () => new Promise((resolve) => (finishPermission = resolve))
  );
  mockFocused = true;
  await act(async () => renderer.update(<Map />));
  mockFocused = false;
  await act(async () => renderer.update(<Map />));
  await act(async () => finishPermission({ status: 'granted' }));
  expect(mockStartLocation).not.toHaveBeenCalled();
  mockRequestPermission.mockResolvedValue({ status: 'granted' });
  mockFocused = true;
  await act(async () => renderer.update(<Map />));
  expect(mockStartLocation).toHaveBeenCalledTimes(1);
  expect(renderer.root.findByType('LocationPuck' as any).props.visible).toBe(true);
  const stopCount = mockStopLocation.mock.calls.length;
  mockFocused = false;
  await act(async () => renderer.update(<Map />));
  expect(mockStopLocation).toHaveBeenCalledTimes(stopCount + 1);
  expect(renderer.root.findByType('LocationPuck' as any).props.pulsing).toEqual({
    isEnabled: false,
  });
});

test('unmount removes the app-state subscription and pending route timer', async () => {
  jest.useFakeTimers();
  const handled = jest.fn();
  await act(async () => {
    renderer.update(<Map initialCoords={{ lat: 1, lng: 2 }} onInitialCoordsHandled={handled} />);
  });
  await act(async () => renderer.unmount());
  expect(appStateListeners.size).toBe(0);
  expect(appStateRemovals.at(-1)).toHaveBeenCalledTimes(1);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(mockSetCamera).not.toHaveBeenCalled();
  expect(handled).not.toHaveBeenCalled();
});
