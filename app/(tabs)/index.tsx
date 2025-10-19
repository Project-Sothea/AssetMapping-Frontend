import React, { useState, useMemo } from 'react';
import { Stack } from 'expo-router';
import { SearchBar } from '~/shared/components/ui/SearchBar';
import { useFetchLocalPins } from '~/features/pins/hooks/useFetchPins';

export default function Home() {
  const { data: pins = [] } = useFetchLocalPins(); // live reactive pins
  const [query, setQuery] = useState('');

  // Filter pins based on search query
  const filteredPins = useMemo(() => {
    const visiblePins = pins.filter((pin) => !pin.deletedAt); // exclude deleted pins
    if (!query.trim()) return visiblePins;

    const lowerQuery = query.toLowerCase();
    return visiblePins.filter((pin) => pin.name?.toLowerCase().includes(lowerQuery));
  }, [query, pins]);

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <SearchBar
        placeholder="Find pin..."
        query={query}
        onQueryChange={setQuery}
        results={filteredPins}
      />
    </>
  );
}
