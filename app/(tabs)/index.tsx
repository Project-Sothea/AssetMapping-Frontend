import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ImageBackground, StyleSheet, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinCard } from '~/features/pins/components/PinCard';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import type { Pin } from '~/features/pins/types/';
import { closeCurrentSwipeable } from '~/shared/components/ui/SwipeableCard';
import backgroundImage from '~/assets/home-background.png';

export default function PinScreen() {
  const pins = useFetchLocalPins(); // live reactive pins
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Close any open swipeable when leaving this screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Cleanup when screen loses focus
        closeCurrentSwipeable();
      };
    }, [])
  );

  // Filter pins based on search query
  const filteredPins = useMemo(() => {
    if (!query.trim()) return pins;

    const lowerQuery = query.toLowerCase();
    return pins.filter((pin) => pin.name?.toLowerCase().includes(lowerQuery));
  }, [query, pins]);

  const handleNavigateToMap = (pin: Pin) => {
    router.push({
      pathname: '/map',
      params: {
        lat: pin.lat,
        lng: pin.lng,
        pinId: pin.id,
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
        imageStyle={styles.backgroundImage}>
        <TextInput
          placeholder="Find pin..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          placeholderTextColor="#888"
        />
        <FlatList
          data={filteredPins}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PinCard pin={item} onNavigateToMap={handleNavigateToMap} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.4,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
