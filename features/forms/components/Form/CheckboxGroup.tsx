import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Checkbox } from 'expo-checkbox';

interface CheckboxGroupProps {
  name: string;
  options: string[];
  values: any;
  setFieldValue: (field: string, value: any) => void;
  errors?: string;
  touched?: boolean;
  otherFieldName?: string;
  otherValue?: string;
  onOtherChange?: (text: string) => void;
}

export default function CheckboxGroup({
  name,
  options,
  values,
  setFieldValue,
  errors,
  touched,
  otherFieldName,
  otherValue,
  onOtherChange,
}: CheckboxGroupProps) {
  const handleCheckbox = (opt: string) => {
    const currentArray: string[] = values[name] || [];
    if (currentArray.includes(opt)) {
      setFieldValue(
        name,
        currentArray.filter((v) => v !== opt)
      );
    } else {
      setFieldValue(name, [...currentArray, opt]);
    }
  };

  return (
    <View>
      {options.map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={(values[name] || []).includes(opt)}
            onValueChange={() => handleCheckbox(opt)}
            style={styles.checkbox}
          />
          <Text style={styles.label}>{opt}</Text>
        </View>
      ))}
      {otherFieldName && values[name]?.includes('Other') && (
        <TextInput
          style={styles.input}
          placeholder="Please specify"
          value={otherValue}
          onChangeText={onOtherChange}
        />
      )}
      {errors && touched && <Text style={styles.error}>{errors}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 10,
    width: 18,
    height: 18,
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
    minHeight: 40,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
