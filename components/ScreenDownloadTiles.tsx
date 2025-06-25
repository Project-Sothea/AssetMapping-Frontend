import { View, Text } from 'react-native';
import MapboxGL from '~/services/mapbox';

//16-18 zoom level
//      [103.390906, 12.829011], //neLg, neLat
//      [103.389445, 12.827979], //swLg, swLat

export default function ScreenDownloadTiles() {
  return (
    <View>
      <Text>Status: {status}%</Text>
      <Text>Progress: {progress}%</Text>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
