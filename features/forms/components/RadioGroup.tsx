import { Checkbox } from 'expo-checkbox';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';

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
        const showOther =
          ['other', 'others'].includes(String(opt.value).toLowerCase()) &&
          isSelected &&
          otherFieldName;

        return (
          <View key={String(opt.value)} style={styles.optionBlock}>
            <Pressable
              style={styles.checkboxContainer}
              accessibilityRole="radio"
              accessibilityLabel={opt.label}
              accessibilityState={{ checked: isSelected, disabled }}
              disabled={disabled}
              onPress={() => {
                if (!disabled) setFieldValue(name, opt.value);
              }}>
              <View pointerEvents="none" importantForAccessibility="no-hide-descendants">
                <Checkbox
                  value={isSelected}
                  onValueChange={() => {
                    if (disabled) return;
                    setFieldValue(name, opt.value);
                  }}
                  style={styles.checkbox}
                  disabled={disabled}
                />
              </View>
              <Text style={styles.label}>{opt.label}</Text>
            </Pressable>

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
    minHeight: 48,
    paddingVertical: 8,
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
