import { View, Text, StyleSheet } from 'react-native';
import { Checkbox } from 'expo-checkbox';

type RadioOption = { label: string; value: string };

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  values: any;
  setFieldValue: (field: string, value: any) => void;
  errors?: string;
  touched?: boolean;
}

export default function RadioGroup({
  name,
  options,
  values,
  setFieldValue,
  errors,
  touched,
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
  error: {
    color: 'red',
    marginBottom: 8,
  },
});

