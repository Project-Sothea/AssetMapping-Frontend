import { View, Text } from 'react-native';
import { useOfflineMapRegion } from '~/hooks/useOfflineMapRegion';
import MapboxGL from '~/services/mapbox';

//16-18 zoom level
export default function MapDownloadTest() {
  const { status, progress, error } = useOfflineMapRegion({
    name: 'MyRegion',
    bounds: [
      [103.390906, 12.829011], //neLg, neLat
      [103.389445, 12.827979], //swLg, swLat
    ],
    minZoom: 16,
    maxZoom: 18,
    styleURL: MapboxGL.StyleURL.Satellite,
  });

  return (
    <View>
      <Text>Status: {status}%</Text>
      <Text>Progress: {progress}%</Text>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
