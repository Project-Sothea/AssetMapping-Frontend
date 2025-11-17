import { View, StyleSheet, ScrollView, ImageBackground } from 'react-native';
import useCreatePack from '~/hooks/OfflinePacks/useCreatePack';
import Spacer from '~/shared/components/ui/Spacer';
import { CreatePackForm } from '~/features/sync/components/OfflinePacks/CreatePackForm';
import PremadePacks from '~/features/sync/components/OfflinePacks/PremadePacks';
import { ApiUrlConfiguration } from '~/features/sync/components/ApiUrlConfiguration';
import { DownloadedPacksList } from '~/features/sync/components/DownloadedPacksList';
import backgroundImage from '~/assets/download-background.png';

export default function Home() {
  const { mutateAsync: createPackMutation, progress, name } = useCreatePack();

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Spacer />

        {/* API URL Configuration with Device ID */}
        <ApiUrlConfiguration />

        {/* Premade Packs */}
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

        {/* Create Pack Form */}
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

        {/* Downloaded Packs List */}
        <DownloadedPacksList excludePackName={name} progress={progress || 0} />
      </ScrollView>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
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
});
