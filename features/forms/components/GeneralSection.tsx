import { View, Text, TextInput, StyleSheet } from 'react-native';

import { FormValues } from '../types';

import RadioGroup from './RadioGroup';

interface GeneralSectionProps {
  values: FormValues;
  setFieldValue: (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;
  handleChange: (field: keyof FormValues) => (value: string) => void;
  errors: Partial<Record<keyof FormValues, string>>;
  touched: Partial<Record<keyof FormValues, boolean>>;
  disabled?: boolean;
  mode?: 'general' | 'conflict';
}

export default function GeneralSection({
  values,
  setFieldValue,
  handleChange,
  errors,
  touched,
  disabled = false,
  mode = 'general',
}: GeneralSectionProps) {
  if (mode === 'conflict') {
    return (
      <View style={{ gap: 12 }}>
        <Text style={styles.question}>
          Tell us more about how the conflict has affected your access to healthcare. Has
          transportation to clinics / hospitals been affected by the war?
        </Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          onChangeText={handleChange('conflictHealthcareAccess')}
          value={values.conflictHealthcareAccess ?? ''}
          placeholder="Your answer"
          multiline
          editable={!disabled}
        />

        <Text style={styles.question}>
          Tell us more about how the conflict has affected how you manage your health. Do you still
          visit the doctor for your health problems? Has the frequency changed?
        </Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          onChangeText={handleChange('conflictHealthManagement')}
          value={values.conflictHealthManagement ?? ''}
          placeholder="Your answer"
          multiline
          editable={!disabled}
        />

        <Text style={styles.question}>
          Tell us more about how the conflict has affected your access to clean water. Has
          transportation or collection of potable water been affected by the war?
        </Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          onChangeText={handleChange('conflictCleanWaterAccess')}
          value={values.conflictCleanWaterAccess ?? ''}
          placeholder="Your answer"
          multiline
          editable={!disabled}
        />

        <Text style={styles.question}>
          Tell us more about how the conflict has affected your cost of living. What necessities are
          more expensive because of the conflict?
        </Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          onChangeText={handleChange('conflictCostOfLiving')}
          value={values.conflictCostOfLiving ?? ''}
          placeholder="Your answer"
          multiline
          editable={!disabled}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.question}>Which village are you from?*</Text>
      <RadioGroup
        name="village"
        options={[
          { label: 'Krang Savt', value: 'Krang Savt' },
          { label: 'Srae Ou', value: 'Srae Ou' },
          { label: 'Other', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherVillage"
        otherValue={values.otherVillage ?? undefined}
        onOtherChange={handleChange('otherVillage')}
        errors={errors.village}
        touched={touched.village}
        disabled={disabled}
      />

      <Text style={styles.question}>Date of data collection*</Text>
      <TextInput
        style={styles.input}
        onChangeText={handleChange('dataCollectionDate')}
        value={values.dataCollectionDate ?? ''}
        placeholder="e.g. 22 May 2026"
        editable={!disabled}
      />
      {errors.dataCollectionDate && touched.dataCollectionDate && (
        <Text style={styles.error}>{errors.dataCollectionDate}</Text>
      )}

      <Text style={styles.question}>
        Are you able to physically attend our health screening in December? Only put No if screening
        is required and there are mobility issues.
      </Text>
      <RadioGroup
        name="canAttendHealthScreening"
        options={[
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        disabled={disabled}
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
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
