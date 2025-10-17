import React from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { Pin } from '~/db/schema';
import { PinCard } from './PinCard';

type SearchBarProps = {
  query: string;
  onQueryChange: (text: string) => void;
  results: Pin[];
  placeholder?: string;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  results,
  placeholder = 'Search...',
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        value={query}
        onChangeText={onQueryChange}
        style={styles.searchInput}
        placeholderTextColor="#888"
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <PinCard pin={item} />}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
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
    marginBottom: 16,
  },
});
