import { View, Text, TextInput, StyleSheet } from 'react-native';

type EditableFieldProps = {
  label: string;
  value: string;
  onChange?: (text: string) => void;
  isEditing: boolean;
  multiline?: boolean;
  placeholder?: string;
};

export const EditableField = ({
  label,
  value,
  onChange,
  isEditing,
  multiline = false,
  placeholder = 'N/A',
}: EditableFieldProps) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}: </Text>
      {isEditing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          multiline={multiline}
          style={[styles.input, multiline && { height: 60 }]}
        />
      ) : (
        <Text>{value || placeholder}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  imageScroll: {
    marginBottom: 12,
  },
  image: {
    width: 120,
    height: 120,
    marginRight: 10,
    borderRadius: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 6,
    borderRadius: 6,
    flex: 1,
  },
});
