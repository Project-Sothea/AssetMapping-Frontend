import { View, Text, StyleSheet } from 'react-native';

import { FormValues } from '../types/';

import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

interface WaterSectionProps {
  values: FormValues;
  setFieldValue: (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;
  handleChange: (field: keyof FormValues) => (value: string) => void;
  disabled?: boolean;
}

export default function WaterSection({
  values,
  setFieldValue,
  handleChange,
  disabled = false,
}: WaterSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.question}>
        What are your sources of water for daily use (e.g., drinking, showering, cooking)?
      </Text>
      <CheckboxGroup
        name="waterSources"
        options={[
          'Boiled water',
          'Filtered water',
          'Bottled water',
          'Rainwater',
          'Lake water',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherWaterSources"
        otherValue={values.otherWaterSources ?? undefined}
        onOtherChange={handleChange('otherWaterSources')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        What kinds of water do you think are NOT safe for drinking?
      </Text>
      <CheckboxGroup
        name="unsafeWaterTypes"
        options={[
          'Unboiled water',
          'Rainwater',
          'Lake water',
          'Water with visible dirt or debris',
          'Water stored in an open container for a long time',
          'Unclean water is safe to drink',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherUnsafeWaterTypes"
        otherValue={values.otherUnsafeWaterTypes ?? undefined}
        onOtherChange={handleChange('otherUnsafeWaterTypes')}
        disabled={disabled}
      />

      <Text style={styles.question}>Do you know what water filters are?</Text>
      <RadioGroup
        name="waterFilterAwareness"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherWaterFilterAwareness"
        otherValue={values.otherWaterFilterAwareness ?? undefined}
        onOtherChange={handleChange('otherWaterFilterAwareness')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Are there any reasons why you would not use a water filter?
      </Text>
      <CheckboxGroup
        name="waterFilterNonUseReasons"
        options={[
          'I have a water filter',
          'Cost',
          'Inconvenience',
          'Water tastes bad',
          'Water filters unavailable',
          'Water filter does not last very long',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherWaterFilterNonUseReasons"
        otherValue={values.otherWaterFilterNonUseReasons ?? undefined}
        onOtherChange={handleChange('otherWaterFilterNonUseReasons')}
        disabled={disabled}
      />

      <Text style={styles.question}>Do you wash your hands with soap after using the toilet?</Text>
      <RadioGroup
        name="handwashingAfterToilet"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'I do not know', value: 'do_not_know' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHandwashingAfterToilet"
        otherValue={values.otherHandwashingAfterToilet ?? undefined}
        onOtherChange={handleChange('otherHandwashingAfterToilet')}
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
});
