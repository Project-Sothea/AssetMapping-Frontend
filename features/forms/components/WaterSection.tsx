import { View, Text, StyleSheet } from 'react-native';
import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';
import type { FormikHandlers } from 'formik';
import type { Form } from '~/db/schema';

interface WaterSectionProps {
  values: Form;
  setFieldValue: (field: string, value: unknown) => void;
  handleChange: FormikHandlers['handleChange'];
}

export default function WaterSection({ values, setFieldValue, handleChange }: WaterSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.heading}>Water</Text>

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
          'Others,',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherWaterFilterNonUseReasons"
        otherValue={values.otherWaterFilterNonUseReasons ?? undefined}
        onOtherChange={handleChange('otherWaterFilterNonUseReasons')}
      />

      <Text style={styles.question}>Do you wash your hands with soap after using the toilet?</Text>
      <CheckboxGroup
        name="handwashingAfterToilet"
        options={['Yes', 'No', 'I do not know', 'Others']}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHandwashingAfterToilet"
        otherValue={values.otherHandwashingAfterToilet ?? undefined}
        onOtherChange={handleChange('otherHandwashingAfterToilet')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
