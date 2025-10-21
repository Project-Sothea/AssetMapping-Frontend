import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IdempotentButton } from '~/shared/components/ui/IdempotentButton';
import { CreateOfflinePackProps } from '~/hooks/OfflinePacks/types';
import MapboxGL from '~/services/mapbox';

interface Props {
  onPress: (options: CreateOfflinePackProps) => void;
  progress?: number;
}

const presets: { id: string; title: string; options: CreateOfflinePackProps }[] = [
  {
    id: 'srae-ou',
    title: 'Srae Ou',
    options: {
      name: 'Srae Ou Pack',
      styleURL: MapboxGL.StyleURL.Street,
      minZoom: 16,
      maxZoom: 22,
      bounds: [
        [103.4002733, 12.8410923], // top-right (lng, lat)
        [103.3813691, 12.81801], // bottom-left (lng, lat)
      ],
    },
  },
  {
    id: 'krang-svat',
    title: 'Krang Svat',
    options: {
      name: 'Krang Svat Pack',
      styleURL: MapboxGL.StyleURL.Street,
      minZoom: 16,
      maxZoom: 22,
      bounds: [
        [103.2235287, 12.7260237], // top-right (lng, lat)
        [103.1956291, 12.695662], // bottom-left (lng, lat)
      ],
    },
  },
];

const PremadePacks: React.FC<Props> = ({ onPress, progress = 0 }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pre-Made Packs</Text>
      <View style={styles.row}>
        {presets.map((p) => (
          <View key={p.id} style={styles.preset}>
            <IdempotentButton title={p.title} onPress={() => onPress(p.options)} />
          </View>
        ))}
      </View>
      <View style={styles.spacer} />
      <View style={[styles.progressContainer, { flexDirection: 'row' }]}> 
        <View style={[styles.progressBar, { flex: Math.max(0, Math.min(1, progress / 100)) }]} />
        <View style={{ flex: 1 - Math.max(0, Math.min(1, progress / 100)) }} />
      </View>
      <Text style={styles.progressText}>Progress: {progress.toFixed(2)}%</Text>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
  },
  header: {
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'column',
    gap: 8,
  },
  preset: {
    marginBottom: 6,
  },
  spacer: {
    height: 8,
  },
  progressContainer: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  progressText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
});

export default PremadePacks;

