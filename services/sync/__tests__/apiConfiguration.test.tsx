import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert, TextInput } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ApiUrlConfiguration } from '~/features/sync/components/ApiUrlConfiguration';
import { getApiUrl, setApiUrl } from '~/services/apiUrl';
import { webSocketManager } from '~/services/websocket/WebSocketManager';
import { Button } from '~/shared/components/ui/Button';
import { getDeviceId } from '~/shared/utils/getDeviceId';

import { finishSetup } from '../transferCoordinator';

jest.mock('~/hooks/RealTimeSync/useTransferState', () => ({
  useTransferState: () => ({ busy: false }),
}));
class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror = null;
  onmessage = null;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}
const originalSocket = global.WebSocket;
let renderer: ReactTestRenderer;
beforeEach(async () => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  global.WebSocket = FakeSocket as unknown as typeof WebSocket;
  finishSetup();
  await AsyncStorage.clear();
  await setApiUrl('https://old.example.test');
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .spyOn(global, 'fetch')
    .mockRejectedValue(new Error('Saving configuration must not transfer data'));
});
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  webSocketManager.disconnect();
  global.WebSocket = originalSocket;
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function save(url: string) {
  await act(async () => {
    renderer = create(<ApiUrlConfiguration />);
  });
  await act(async () => {
    renderer.root.findByType(TextInput).props.onChangeText(url);
  });
  await act(async () => {
    await renderer.root.findByType(Button).props.onPress();
  });
}

test('pasted whitespace is normalized before validation and reconnects without a transfer', async () => {
  await save('  https://new.example.test/  ');
  expect(await getApiUrl()).toBe('https://new.example.test');
  expect(FakeSocket.instances.at(-1)?.url).toMatch(
    /^wss:\/\/new\.example\.test\/ws\/notifications/
  );
  expect(fetch).not.toHaveBeenCalled();
});

test('changing an already-connected URL replaces the socket for the same device', async () => {
  await webSocketManager.connect(getDeviceId());
  const old = FakeSocket.instances[0];
  old.open();
  await save('https://new.example.test');
  expect(old.readyState).toBe(3);
  expect(FakeSocket.instances.at(-1)?.url).toMatch(/^wss:\/\/new\.example\.test\//);
  FakeSocket.instances.at(-1)!.open();
  await jest.advanceTimersByTimeAsync(30000);
  expect(FakeSocket.instances).toHaveLength(2);
  expect(fetch).not.toHaveBeenCalled();
});

test('manual disconnect cannot schedule another automatic socket connection', async () => {
  await webSocketManager.connect(getDeviceId());
  FakeSocket.instances[0].open();
  webSocketManager.disconnect();
  await jest.advanceTimersByTimeAsync(60000);
  expect(FakeSocket.instances).toHaveLength(1);
});

test('a connection still resolving its URL cannot reopen after a manual disconnect', async () => {
  let release!: (url: string) => void;
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  const pending = webSocketManager.connect(getDeviceId());
  webSocketManager.disconnect();
  release('https://old.example.test');
  await pending;
  expect(FakeSocket.instances).toHaveLength(0);
});

test.each(['https://', 'ftp://new.example.test', 'not a URL'])(
  'invalid URL %s is not persisted or connected',
  async (value) => {
    await save(value);
    expect(await getApiUrl()).toBe('https://old.example.test');
    expect(FakeSocket.instances).toHaveLength(0);
    expect(Alert.alert).toHaveBeenCalledWith('Invalid URL', expect.any(String));
  }
);
