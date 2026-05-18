import { View, Text, StyleSheet, TextInput } from 'react-native';

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
          "I'm not sure",
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherUnsafeWaterTypes"
        otherValue={values.otherUnsafeWaterTypes ?? undefined}
        onOtherChange={handleChange('otherUnsafeWaterTypes')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Do you know some of the negative health consequences from not drinking clean water?
      </Text>
      <RadioGroup
        name="waterHealthConsequences"
        options={[
          {
            label:
              'Yes. Getting sick, not being able to work or go to school, needing to go to the hospital',
            value: 'yes_specific',
          },
          {
            label:
              "No, I know it's harmful but I don't know what are the negative health consequences",
            value: 'harmful_unsure_specifics',
          },
          { label: "No, I don't think it is harmful", value: 'not_harmful' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Do you know some of the negative socioeconomic consequences from not drinking clean water?
      </Text>
      <RadioGroup
        name="waterSocioeconomicConsequences"
        options={[
          {
            label: 'Yes. Not being able to go to work, needing to spend money to visit the doctor',
            value: 'yes_specific',
          },
          {
            label:
              "No, I know there are negative socioeconomic consequences but I don't know what they are specifically",
            value: 'consequences_unsure_specifics',
          },
          { label: "No, I don't think there are socioeconomic consequences", value: 'none' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        disabled={disabled}
      />

      <Text style={styles.question}>Do you know what water filters are?</Text>
      <RadioGroup
        name="waterFilterAwareness"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: "No, I don't know", value: 'no' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Have you used a water filter before? If yes, how has the experience been? If no, would you
        be open to trying it out?
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Your answer"
        value={values.waterFilterExperience ?? ''}
        onChangeText={handleChange('waterFilterExperience')}
        multiline
        editable={!disabled}
      />

      <Text style={styles.question}>Do you wash your hands before meals?</Text>
      <RadioGroup
        name="handwashingBeforeMeals"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        disabled={disabled}
      />

      <Text style={styles.question}>If no, specify why you do not wash your hands.</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Your answer"
        value={values.handwashingBeforeMealsReason ?? ''}
        onChangeText={handleChange('handwashingBeforeMealsReason')}
        multiline
        editable={!disabled}
      />

      <Text style={styles.question}>
        What is your most pressing health need or concern right now? How would you like Project
        Sothea to best support your health in the future?
      </Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="Your answer"
        value={values.pressingHealthNeed ?? ''}
        onChangeText={handleChange('pressingHealthNeed')}
        multiline
        editable={!disabled}
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
});
