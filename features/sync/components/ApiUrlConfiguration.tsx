import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, TextInput } from 'react-native';

import { resetApiBaseUrlCache } from '~/services/api/client';
import { getApiUrl, setApiUrl } from '~/services/apiUrl';
import { reconnectAndSync } from '~/services/sync/syncService';
import { webSocketManager } from '~/services/websocket/WebSocketManager';
import { Button } from '~/shared/components/ui/Button';
import Spacer from '~/shared/components/ui/Spacer';
import { getDeviceId } from '~/shared/utils/getDeviceId';

import { DeviceIdDisplay } from './DeviceIdDisplay';

export function ApiUrlConfiguration() {
  const [apiUrl, setApiUrlState] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadApiUrl = async () => {
      try {
        const storedUrl = await getApiUrl();
        setApiUrlState(storedUrl || '');
      } catch (error) {
        setApiUrlState(process.env.EXPO_PUBLIC_API_URL ?? '');
        Alert.alert(
          'QA API restriction',
          error instanceof Error ? error.message : 'This QA build only allows the local QA API.'
        );
      }
    };
    loadApiUrl();
  }, []);

  const saveApiUrl = async () => {
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }

    let apiUrlSaved = false;
    try {
      setIsSyncing(true);

      // Save the new API URL
      await setApiUrl(apiUrl);
      apiUrlSaved = true;
      resetApiBaseUrlCache();

      // Use the centralized reconnect and sync service
      const deviceId = getDeviceId();
      await reconnectAndSync(deviceId, webSocketManager);

      Alert.alert('Success', 'API URL updated and data synced successfully!');
    } catch (error) {
      console.error('❌ Failed to connect or sync:', error);
      Alert.alert(
        apiUrlSaved ? 'Sync Failed' : 'API URL Rejected',
        error instanceof Error
          ? error.message
          : apiUrlSaved
            ? 'The API URL was saved, but sync failed. Please check the local QA services.'
            : 'The API URL could not be saved.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Device ID Display */}

      <Text style={styles.sectionHeader}>Connect To The Network:</Text>
      <DeviceIdDisplay />
      <Spacer />
      <TextInput
        style={styles.input}
        placeholder="https://assetmapping-backend.onrender.com"
        value={apiUrl}
        onChangeText={setApiUrlState}
      />
      <Spacer />
      <Button
        title={isSyncing ? 'Connecting & Syncing...' : 'Save API URL'}
        onPress={saveApiUrl}
        disabled={isSyncing}
        style={isSyncing ? styles.saveButtonDisabled : undefined}
      />
      {!apiUrl && (
        <>
          <Spacer />
          <Text style={styles.warningText}>
            ⚠️ No API URL configured. Please enter your backend server URL above.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
});
