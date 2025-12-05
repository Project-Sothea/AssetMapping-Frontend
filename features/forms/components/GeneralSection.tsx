import { View, Text, TextInput, StyleSheet } from 'react-native';
import RadioGroup from './RadioGroup';
import type { Form } from '~/db/schema';

interface GeneralSectionProps {
  values: Form;
  setFieldValue: (field: keyof Form, value: Form[keyof Form]) => void;
  handleChange: (field: keyof Form) => (value: string) => void;
  errors: Partial<Record<keyof Form, string>>;
  touched: Partial<Record<keyof Form, boolean>>;
}

export default function GeneralSection({
  values,
  setFieldValue,
  handleChange,
  errors,
  touched,
}: GeneralSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.question}>Which village are you from?*</Text>
      <RadioGroup
        name="village"
        options={[
          { label: 'Krang Svat', value: 'ks' },
          { label: 'Srae Ou', value: 'so' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        errors={errors.village}
        touched={touched.village}
      />

      <Text style={styles.question}>What is your name?*</Text>
      <TextInput
        style={styles.input}
        onChangeText={handleChange('name')}
        value={values.name as string}
      />
      {errors.name && touched.name && <Text style={styles.error}>{errors.name}</Text>}

      <Text style={styles.question}>What is your household number?*</Text>
      <TextInput
        style={styles.input}
        onChangeText={handleChange('villageId')}
        value={values.villageId as string}
        placeholder="e.g. A1, B2"
      />
      {errors.villageId && touched.villageId && (
        <Text style={styles.error}>{errors.villageId}</Text>
      )}

      <Text style={styles.question}>What is your gender?</Text>
      <RadioGroup
        name="gender"
        options={[
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>How old are you this year?</Text>
      <TextInput
        style={styles.input}
        onChangeText={(text) => setFieldValue('age', text ? parseInt(text, 10) : '')}
        value={values.age !== null && values.age !== undefined ? String(values.age) : ''}
        keyboardType="numeric"
      />

      <Text style={styles.question}>
        Are you able to physically attend our health screening in December?
      </Text>
      <RadioGroup
        name="canAttendHealthScreening"
        options={[
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  question: {
    fontSize: 16,
    fontWeight: '500',
    marginVertical: 6,
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
