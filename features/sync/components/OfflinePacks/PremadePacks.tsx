import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IdempotentButton } from '~/shared/components/ui/IdempotentButton';
import { CreateOfflinePackProps } from '~/hooks/OfflinePacks/types';
import MapboxGL from '~/services/mapbox';

interface Props {
  onPress: (options: CreateOfflinePackProps) => void;
  progress?: number; // 0..100
  frameless?: boolean; // if true, no white card wrapper (use when parent provides a card)
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

const PremadePacks: React.FC<Props> = ({ onPress, progress = 0, frameless = false }) => {
  const p = Math.max(0, Math.min(100, progress));
  const inProgress = p > 0 && p < 100;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>Pre-Made Packs</Text>

      {/* 2-column grid */}
      <View style={styles.grid}>
        {presets.map((preset) => (
          <View key={preset.id} style={styles.cell}>
            <IdempotentButton
              title={preset.title}
              onPress={() => onPress(preset.options)}
              disabled={inProgress} // lock while downloading
            />
          </View>
        ))}
      </View>

      <View style={styles.spacer} />

      {/* progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${p}%` }]} />
      </View>
      <Text style={styles.progressText}>Progress: {p.toFixed(2)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 0,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },

  // grid layout
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  cell: {
    flexBasis: '48%', // two per row
    flexGrow: 1,
  },

  spacer: { height: 0 },

  progressContainer: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#256f27ff',
  },
  progressText: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
});

export default PremadePacks;
