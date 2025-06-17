import { useState } from 'react';
import { ActivityIndicator, Image, Text } from 'react-native';
import { Button } from '~/components/Button';
import { createSnapshot } from '~/apis/createSnapshot';
import { ScreenWrapper } from '~/components/customUI/ScreenWrapper';
import { boundsSreO, exactCoordsSreO } from '~/data/testingData';
import { createSnapshotCenter } from '~/apis/createSnapshotCenter';
import Spacer from '~/components/customUI/Spacer';

export default function Home() {
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);

  const handleSnapshot = async () => {
    const uri = await createSnapshot(boundsSreO, 1000, 1000);
    if (uri) {
      setSnapshotUri(uri);
    }
  };
  const handleSnapshotCenter = async () => {
    const uri = await createSnapshotCenter(exactCoordsSreO, 2048, 2048, 21);
    if (uri) {
      setSnapshotUri(uri);
    }
  };
  const resetSnapshot = () => {
    setSnapshotUri(null); // or setSnapshotUri('')
  };

  return (
    <ScreenWrapper>
      <Button title="Reset Snapshot" onPress={resetSnapshot} />
      <Spacer />
      <Button title="Take Snapshot" onPress={handleSnapshotCenter} />
      {snapshotUri ? (
        <Image
          source={{ uri: snapshotUri }}
          style={{ width: '100%', height: 300, marginTop: 20 }}
          resizeMode="contain"
        />
      ) : (
        <ActivityIndicator />
      )}
    </ScreenWrapper>
  );
}
