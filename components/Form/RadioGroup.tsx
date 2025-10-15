import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Checkbox } from 'expo-checkbox';

type RadioOption = { label: string; value: string };

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  values: any;
  setFieldValue: (field: string, value: any) => void;
  errors?: string;
  touched?: boolean;
  otherFieldName?: string;
  otherValue?: string;
  onOtherChange?: (text: string) => void;
}

export default function RadioGroup({
  name,
  options,
  values,
  setFieldValue,
  errors,
  touched,
  otherFieldName,
  otherValue,
  onOtherChange,
}: RadioGroupProps) {
  return (
    <View>
      {options.map((opt) => (
        <View key={opt.value} style={styles.checkboxContainer}>
          <Checkbox
            value={values[name] === opt.value}
            onValueChange={() => setFieldValue(name, opt.value)}
            style={styles.checkbox}
          />
          <Text style={styles.label}>{opt.label}</Text>
          {opt.value === 'other' && values[name] === 'other' && otherFieldName && (
            <TextInput 
              style={styles.otherInput}
              placeholder='Please specify'
              value={otherValue}
              onChangeText={onOtherChange}
            />
          )}
        </View>
      ))}
      {errors && touched && <Text style={styles.error}>{errors}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // more space between rows
  },
  checkbox: {
    marginRight: 10,
    width: 18,   // smaller box
    height: 18,  // smaller box
  },
  label: {
    fontSize: 16,
    color: '#333',
  },
  otherInput: {
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

