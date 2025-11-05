import React, { useState, useMemo, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { SearchBar } from '~/shared/components/ui/SearchBar';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';
import { Pin } from '~/db/schema';
import { closeCurrentSwipeable } from '~/shared/components/ui/SwipeableCard';

export default function Home() {
  const { data: pins = [] } = useFetchLocalPins(); // live reactive pins
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
    const visiblePins = pins.filter((pin) => !pin.deletedAt); // exclude deleted pins
    if (!query.trim()) return visiblePins;

    const lowerQuery = query.toLowerCase();
    return visiblePins.filter((pin) => pin.name?.toLowerCase().includes(lowerQuery));
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
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <SearchBar
        placeholder="Find pin..."
        query={query}
        onQueryChange={setQuery}
        results={filteredPins}
        onNavigateToMap={handleNavigateToMap}
      />
    </>
  );
}
