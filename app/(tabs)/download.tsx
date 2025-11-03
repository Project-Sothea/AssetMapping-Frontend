import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Button,
} from 'react-native';
import { ScreenWrapper } from '~/shared/components/ui/ScreenWrapper';
import useCreatePack from '~/hooks/OfflinePacks/useCreatePack';
import { useDeletePack } from '~/hooks/OfflinePacks/useDeletePack';
import { useFetchPacks } from '~/hooks/OfflinePacks/useFetchPacks';
import Spacer from '~/shared/components/ui/Spacer';
import { CreatePackForm } from '~/features/sync/components/OfflinePacks/CreatePackForm';
import PremadePacks from '~/features/sync/components/OfflinePacks/PremadePacks';
import { useState, useEffect } from 'react';
import { getApiUrl, setApiUrl } from '~/services/apiUrl';

export default function Home() {
  const { mutateAsync: createPackMutation, progress, name } = useCreatePack();
  const { mutateAsync: deletePackMutation } = useDeletePack();
  const { data: packs } = useFetchPacks();
  const [apiUrl, setApiUrlState] = useState('');

  useEffect(() => {
    const loadApiUrl = async () => {
      const storedUrl = await getApiUrl();
      setApiUrlState(storedUrl || '');
    };
    loadApiUrl();
  }, []);

  const saveApiUrl = async () => {
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }
    await setApiUrl(apiUrl);
    Alert.alert('Saved', 'API URL updated successfully');
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Spacer />
        {/* API URL Input Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Backend API URL</Text>
          <Spacer />
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.100:3000"
            value={apiUrl}
            onChangeText={setApiUrlState}
          />
          <Spacer />
          <Button title="Save API URL" onPress={saveApiUrl} />
          {!apiUrl && (
            <>
              <Spacer />
              <Text style={styles.warningText}>
                ⚠️ No API URL configured. Please enter your backend server URL above.
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <PremadePacks
            progress={progress || 0}
            onPress={async (pack) => {
              try {
                await createPackMutation(pack);
              } catch (err) {
                console.error('Premade pack error:', err);
              }
            }}
          />
        </View>

        <View style={styles.card}>
          <CreatePackForm
            onSubmit={async (pack) => {
              try {
                await createPackMutation(pack);
              } catch (err) {
                console.error(err);
              }
            }}
            progress={progress || 0}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Downloaded Packs</Text>
          <Spacer />
          {packs && packs.length > 0 ? (
            packs
              .filter((item) => (item.name !== name ? true : progress === 100))
              .map((item) => (
                <TouchableOpacity
                  key={item.name}
                  onPress={() => {
                    Alert.alert('Delete Pack', `Delete "${item.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deletePackMutation(item.name);
                            console.log('Deleted pack:', item.name);
                          } catch (err) {
                            console.error('Delete error:', err);
                          }
                        },
                      },
                    ]);
                  }}
                  style={styles.packRow}>
                  <Text style={styles.packName}>📦 {item.name}</Text>
                  <Text style={styles.deleteHint}>Delete</Text>
                </TouchableOpacity>
              ))
          ) : (
            <Text style={styles.emptyText}>No packs downloaded yet.</Text>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ScrollView padding + spacing so the first card sits lower
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12, // 👈 moves everything down from the notch
    paddingBottom: 24,
    gap: 12, // space between cards
  },
  // Generic card wrapper to unify look
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    // subtle shadow
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
  title: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 4,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 4,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 18,
    color: 'red',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  // Downloaded packs list rows
  packRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
  },
  packName: {
    fontSize: 14,
    color: '#111827',
  },
  deleteHint: {
    fontSize: 13,
    color: '#AF0018',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
