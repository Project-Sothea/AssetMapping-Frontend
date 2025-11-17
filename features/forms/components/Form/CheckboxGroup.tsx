import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Checkbox } from 'expo-checkbox';
import type { Form } from '~/db/schema';

interface CheckboxGroupProps {
  name: keyof Form;
  options: string[];
  values: Form;
  setFieldValue: (field: string, value: unknown) => void;
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
    const currentArray = (Array.isArray(values[name]) ? values[name] : []) as string[];
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
            value={(Array.isArray(values[name]) ? values[name] : []).includes(opt)}
            onValueChange={() => handleCheckbox(opt)}
            style={styles.checkbox}
          />
          <Text style={styles.label}>{opt}</Text>
        </View>
      ))}
      {otherFieldName && Array.isArray(values[name]) && values[name].includes('Other') && (
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
