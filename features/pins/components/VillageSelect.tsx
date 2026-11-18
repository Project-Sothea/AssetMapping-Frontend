import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { VILLAGES } from '~/shared/constants/villages';

type VillageSelectProps = {
  value: string;
  onChange: (village: string) => void;
};

export function VillageSelect({ value, onChange }: VillageSelectProps) {
  const fieldRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const selected = value.trim();
  const options = VILLAGES;
  const close = () => setAnchor(null);
  const toggle = () => {
    if (anchor) {
      close();
      return;
    }
    Keyboard.dismiss();
    fieldRef.current?.measureInWindow((x, y, width, height) => {
      const screen = Dimensions.get('window');
      const below = screen.height - y - height - 16;
      const above = y - 16;
      const desired = options.length * 48 + 2;
      const showAbove = below < desired && above > below;
      const menuHeight = Math.min(desired, Math.max(48, showAbove ? above : below));
      const menuWidth = Math.min(width, screen.width - 24);
      setAnchor({
        left: Math.max(12, Math.min(x, screen.width - menuWidth - 12)),
        top: showAbove ? Math.max(12, y - menuHeight - 4) : y + height + 4,
        width: menuWidth,
        height: menuHeight,
      });
    });
  };

  return (
    <View ref={fieldRef} collapsable={false} style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Village"
        accessibilityState={{ expanded: !!anchor }}
        style={styles.field}
        onPress={toggle}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected || 'Select a village'}
        </Text>
        <MaterialIcons
          name={anchor ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={28}
          color="#111827"
        />
      </Pressable>
      <Modal
        visible={!!anchor}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={close}>
        {anchor && (
          <View style={styles.overlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close village list"
              style={StyleSheet.absoluteFill}
              onPress={close}
            />
            <View style={[styles.menu, anchor]}>
              <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
                {options.map((village) => {
                  const isSelected = village.toLowerCase() === selected.toLowerCase();
                  return (
                    <Pressable
                      key={village}
                      accessibilityRole="button"
                      accessibilityLabel={village}
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => {
                        onChange(village);
                        close();
                      }}>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {village}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  overlay: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
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
    color: '#666',
  },
  menu: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  option: {
    minHeight: 48,
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
