import { View, Text, TextInput, StyleSheet } from 'react-native';
import RadioGroup from './RadioGroup';
import type { FormikErrors, FormikTouched, FormikHandlers } from 'formik';
import type { Form } from '~/db/schema';

interface GeneralSectionProps {
  values: Form;
  setFieldValue: (field: string, value: unknown) => void;
  handleChange: FormikHandlers['handleChange'];
  handleBlur: FormikHandlers['handleBlur'];
  errors: FormikErrors<Form>;
  touched: FormikTouched<Form>;
}

export default function GeneralSection({
  values,
  setFieldValue,
  handleChange,
  handleBlur,
  errors,
  touched,
}: GeneralSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Form name*</Text>
        <TextInput
          style={styles.inputTitle}
          onChangeText={handleChange('formName')}
          onBlur={handleBlur('formName')}
          value={values.formName as string}
          placeholder="e.g. 2025 December"
        />
        {errors.formName && touched.formName && <Text style={styles.error}>{errors.formName}</Text>}
        <Text style={styles.helperText}>
          This name uniquely identifies the form across exports and downloads.
        </Text>
      </View>

      <Text style={styles.heading}>General</Text>

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

      <Text style={styles.question}>What is your name?</Text>
      <TextInput
        style={styles.input}
        onChangeText={handleChange('name')}
        value={values.name as string}
      />

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
        onChangeText={handleChange('age')}
        value={values.age !== null && values.age !== undefined ? String(values.age) : ''}
        keyboardType="numeric"
      />

      <Text style={styles.question}>What is your household number?*</Text>
      <TextInput
        style={styles.input}
        onChangeText={handleChange('villageId')}
        onBlur={handleBlur('villageId')}
        value={values.villageId as string}
        placeholder="e.g. A1, B2"
      />
      {errors.villageId && touched.villageId && (
        <Text style={styles.error}>{errors.villageId}</Text>
      )}

      <Text style={styles.question}>
        Are you able to physically attend our health screening in December?
      </Text>
      <RadioGroup
        name="canAttendHealthScreening"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    marginTop: 2,
    marginBottom: 2,
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  inputTitle: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 48,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 20,
    marginVertical: 12,
  },
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
