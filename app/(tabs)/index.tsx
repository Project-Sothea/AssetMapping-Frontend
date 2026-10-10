import type { Pin } from '@assetmapping/shared-types';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useMemo, useCallback } from 'react';
import { ImageBackground, StyleSheet, FlatList, Text, TextInput } from 'react-native';

import backgroundImage from '~/assets/home-background.png';
import { PinCard } from '~/features/pins/components/PinCard';
import { VillageDropdown } from '~/features/pins/components/VillageDropdown';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import {
  ALL_VILLAGES_KEY,
  comparePinNames,
  listVillageOptions,
  villageKey,
} from '~/features/pins/utils/groupPinsByVillage';
import { closeCurrentSwipeable } from '~/shared/components/ui/SwipeableCard';

export default function PinScreen() {
  const pins = useFetchLocalPins(); // live reactive pins
  const [query, setQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(ALL_VILLAGES_KEY);
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

  const villageOptions = useMemo(() => listVillageOptions(pins), [pins]);
  const activeVillage = villageOptions.some((option) => option.key === selectedVillage)
    ? selectedVillage
    : ALL_VILLAGES_KEY;

  const visiblePins = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();

    return pins
      .filter((pin) => {
        if (activeVillage !== ALL_VILLAGES_KEY && villageKey(pin) !== activeVillage) {
          return false;
        }
        if (!trimmedQuery) return true;
        return (pin.name?.toLowerCase() ?? '').includes(trimmedQuery);
      })
      .sort(comparePinNames);
  }, [pins, query, activeVillage]);

  const handleNavigateToMap = (pin: Pin) => {
    router.push({
      pathname: '/map',
      params: {
        lat: pin.lat,
        lng: pin.lng,
      },
    });
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}>
      <VillageDropdown
        options={villageOptions}
        value={activeVillage}
        onChange={setSelectedVillage}
      />
      <TextInput
        placeholder="Find pin..."
        value={query}
        onChangeText={setQuery}
        style={styles.searchInput}
        placeholderTextColor="#888"
      />
      <FlatList
        data={visiblePins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PinCard pin={item} onNavigateToMap={handleNavigateToMap} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {query.trim()
              ? 'No pins match that search.'
              : activeVillage === ALL_VILLAGES_KEY
                ? 'No pins yet.'
                : 'No pins in this village.'}
          </Text>
        }
      />
    </ImageBackground>
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
  emptyText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 24,
  },
});
