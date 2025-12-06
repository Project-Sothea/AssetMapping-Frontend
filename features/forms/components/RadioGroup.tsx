import { View, Text, StyleSheet, TextInput } from 'react-native';
import { Checkbox } from 'expo-checkbox';
import { FormValues } from '../types';

interface RadioGroupProps {
  name: keyof FormValues;
  options: { label: string; value: string | boolean }[];
  values: FormValues;
  setFieldValue: (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;
  errors?: string;
  touched?: boolean;
  otherFieldName?: string;
  otherValue?: string;
  onOtherChange?: (text: string) => void;
  disabled?: boolean;
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
  disabled = false,
}: RadioGroupProps) {
  return (
    <View>
      {options.map((opt) => {
        const isSelected = values[name] === opt.value;
        const showOther = opt.value === 'others' && isSelected && otherFieldName;

        return (
          <View key={String(opt.value)} style={styles.optionBlock}>
            <View style={styles.checkboxContainer}>
              <Checkbox
                value={isSelected}
                onValueChange={() => {
                  if (disabled) return;
                  setFieldValue(name, opt.value);
                }}
                style={styles.checkbox}
                disabled={disabled}
              />
              <Text style={styles.label}>{opt.label}</Text>
            </View>

            {showOther && (
              <TextInput
                style={styles.otherInput} // same style as your input
                placeholder="Please specify"
                value={otherValue}
                onChangeText={onOtherChange}
                autoFocus
                returnKeyType="done"
                editable={!disabled}
              />
            )}
          </View>
        );
      })}
      {errors && touched && <Text style={styles.error}>{errors}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  optionBlock: {
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // more space between rows
  },
  checkbox: {
    marginRight: 10,
    width: 18, // smaller box
    height: 18, // smaller box
    borderRadius: 11, // make it circular
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
    width: '100%',
    backgroundColor: '#fff',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
