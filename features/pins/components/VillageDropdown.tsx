import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { VillageOption } from '~/features/pins/utils/groupPinsByVillage';

type VillageDropdownProps = {
  options: VillageOption[];
  value: string;
  onChange: (key: string) => void;
};

export function VillageDropdown({ options, value, onChange }: VillageDropdownProps) {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const selected = options.find((option) => option.key === value) ?? options[0];

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false} style={styles.triggerHost}>
        <Pressable style={styles.trigger} onPress={openMenu}>
          <Text style={styles.label}>Village</Text>
          <Text style={styles.value} numberOfLines={1}>
            {selected?.label ?? 'All villages'}
          </Text>
          <MaterialIcons
            name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
            size={28}
            color="#111827"
          />
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.menu,
              { top: anchor.y + anchor.height + 6, left: anchor.x, width: anchor.width },
            ]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.key}
              style={styles.menuList}
              renderItem={({ item }) => {
                const isSelected = item.key === value;
                return (
                  <Pressable
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onChange(item.key);
                      setOpen(false);
                    }}>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerHost: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 10,
    paddingLeft: 20,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 10,
  },
  value: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: 280,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  menuList: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
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
