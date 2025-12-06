import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SectionProps = {
  title: string;
  isOpen: boolean;
  onPress: () => void;
  children: React.ReactNode;
};

export default function FormSection({ title, isOpen, onPress, children }: SectionProps) {
  return (
    <View style={{ marginBottom: 4 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text>{isOpen ? '−' : '+'}</Text>
      </TouchableOpacity>
      {isOpen && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBody: {
    marginBottom: 16,
  },
});
