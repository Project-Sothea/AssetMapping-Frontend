import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import Map from '~/features/map/components/Map';

export default function MapScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const initialCoords = useMemo(
    () =>
      params.lat && params.lng ? { lat: Number(params.lat), lng: Number(params.lng) } : undefined,
    [params.lat, params.lng]
  );

  // Clear params when user navigates away from this tab
  useFocusEffect(
    useCallback(() => {
      // When screen gains focus, mark that we've shown the initial coords
      if (initialCoords) {
        hasNavigatedRef.current = true;
      }

      return () => {
        // When screen loses focus (user switches tabs), clear the params
        if (hasNavigatedRef.current) {
          router.setParams({ lat: undefined, lng: undefined, pinId: undefined });
          hasNavigatedRef.current = false;
        }
      };
    }, [initialCoords, router])
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <Map initialCoords={initialCoords} />
    </SafeAreaView>
  );
}
