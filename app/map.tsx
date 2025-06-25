import { Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '~/components/Button';
import Map from '~/components/Map';
import { ScreenWrapper } from '~/components/customUI/ScreenWrapper';

export default function Home() {
  return (
    <ScreenWrapper>
      <Map />
    </ScreenWrapper>
  );
}

//ERROR:  Mapbox [error] MapLoad error Failed to load tile:
