import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import Map from '~/features/map/components/Map';

export default function MapScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const initialCoords = useMemo(
    () =>
      params.lat && params.lng ? { lat: Number(params.lat), lng: Number(params.lng) } : undefined,
    [params.lat, params.lng]
  );

  const handleInitialCoordsHandled = useCallback(() => {
    router.setParams({ lat: undefined, lng: undefined, pinId: undefined });
  }, [router]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <Map initialCoords={initialCoords} onInitialCoordsHandled={handleInitialCoordsHandled} />
    </SafeAreaView>
  );
}
