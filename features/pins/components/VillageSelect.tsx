import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VILLAGES } from '~/shared/constants/villages';

type VillageSelectProps = {
  value: string;
  onChange: (village: string) => void;
};

export function VillageSelect({ value, onChange }: VillageSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = value.trim();
  const known = VILLAGES.some((village) => village.toLowerCase() === selected.toLowerCase());
  const options = known || !selected ? VILLAGES : [...VILLAGES, selected];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Village"
        style={styles.field}
        onPress={() => setOpen((current) => !current)}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected || 'Select a village'}
        </Text>
        <MaterialIcons
          name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={28}
          color="#111827"
        />
      </Pressable>
      {open && (
        <View style={styles.menu}>
          {options.map((village) => {
            const isSelected = village.toLowerCase() === selected.toLowerCase();
            return (
              <Pressable
                key={village}
                accessibilityRole="button"
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  onChange(village);
                  setOpen(false);
                }}>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {village}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    flex: 1,
    fontSize: 16,
    color: '#888',
  },
  menu: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: -6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionSelected: {
    backgroundColor: '#EEF2FF',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#4F46E5',
  },
});
