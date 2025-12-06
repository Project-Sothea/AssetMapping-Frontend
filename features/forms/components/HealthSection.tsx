import { View, Text, TextInput, StyleSheet } from 'react-native';

import { FormValues } from '../types';

import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

interface HealthSectionProps {
  values: FormValues;
  setFieldValue: (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;
  handleChange: (field: keyof FormValues) => (value: string) => void;
  disabled?: boolean;
}

export default function HealthSection({
  values,
  setFieldValue,
  handleChange,
  disabled = false,
}: HealthSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.question}>Do you have any long-term conditions?</Text>
      <CheckboxGroup
        name="longTermConditions"
        options={[
          'MSK Conditions',
          'Gastrointestinal Conditions',
          'Eye/Visual Acuity',
          'Hypertension',
          'Diabetes Mellitus',
          'High Cholesterol',
          'Neurological (Headache/Dementia/Epilepsy)',
          'Do not have any',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherLongTermConditions"
        otherValue={values.otherLongTermConditions ?? undefined}
        onOtherChange={handleChange('otherLongTermConditions')}
        disabled={disabled}
      />

      <Text style={styles.question}>How do you manage your condition?</Text>
      <CheckboxGroup
        name="managementMethods"
        options={[
          "Go to the doctor's",
          'Get medicine',
          'I do not manage',
          'I do not know how to manage',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherManagementMethods"
        otherValue={values.otherManagementMethods ?? undefined}
        onOtherChange={handleChange('otherManagementMethods')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Is it difficult to manage your condition? If so, what makes it hard?
      </Text>
      <CheckboxGroup
        name="conditionDifficultyReasons"
        options={[
          'Too expensive',
          'Medicine not available (in nearby places)',
          'No transportation',
          'Do not know what to do',
          'Doctor said it is unnecessary to treat',
          'I think it is unnecessary to treat',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherConditionDifficultyReasons"
        otherValue={values.otherConditionDifficultyReasons ?? undefined}
        onOtherChange={handleChange('otherConditionDifficultyReasons')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        What do you do when you are sick and Project Sothea is not around to help?
      </Text>
      <CheckboxGroup
        name="selfCareActions"
        options={[
          'Do not do anything about it and just hope I will get better over time',
          'Seek medical help',
          'Take herbal or traditional medicine available in the village',
          'I do not know what to do',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherSelfCareActions"
        otherValue={values.otherSelfCareActions ?? undefined}
        onOtherChange={handleChange('otherSelfCareActions')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Do you know where to find a doctor if you are not feeling well?
      </Text>
      <RadioGroup
        name="knowWhereToFindDoctor"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'I do not find a doctor', value: 'do_not_find' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherKnowWhereToFindDoctor"
        otherValue={values.otherKnowWhereToFindDoctor ?? undefined}
        onOtherChange={handleChange('otherKnowWhereToFindDoctor')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Do you have your own means of transport to visit a clinic when you are unwell?
      </Text>
      <RadioGroup
        name="transportToClinic"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'I do not know how to get there', value: 'do_not_know' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherTransportToClinic"
        otherValue={values.otherTransportToClinic ?? undefined}
        onOtherChange={handleChange('otherTransportToClinic')}
        disabled={disabled}
      />

      <Text style={styles.question}>Where do you go to buy your medicine?</Text>
      <CheckboxGroup
        name="medicinePurchaseLocations"
        options={[
          'Pharmacy',
          'I do not wish to buy medicine',
          'I do not know where to go',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherMedicinePurchaseLocations"
        otherValue={values.otherMedicinePurchaseLocations ?? undefined}
        onOtherChange={handleChange('otherMedicinePurchaseLocations')}
        disabled={disabled}
      />

      <Text style={styles.question}>Do you know what the poverty card scheme is about?</Text>
      <RadioGroup
        name="povertyCardSchemeAwareness"
        options={[
          { label: 'Yes and I use it', value: 'use' },
          { label: 'Yes but I do not use it', value: 'do_not_use' },
          { label: 'No', value: 'no' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherPovertyCardSchemeAwareness"
        otherValue={values.otherPovertyCardSchemeAwareness ?? undefined}
        onOtherChange={handleChange('otherPovertyCardSchemeAwareness')}
        disabled={disabled}
      />

      <Text style={styles.question}>Do you brush your teeth?</Text>
      <RadioGroup
        name="toothBrushingFrequency"
        options={[
          { label: 'Yes, twice a day', value: 'twice_a_day' },
          { label: 'Yes, once a day', value: 'once_a_day' },
          { label: 'No', value: 'no' },
          { label: 'I do not know', value: 'do_not_know' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherToothBrushingFrequency"
        otherValue={values.otherToothBrushingFrequency ?? undefined}
        onOtherChange={handleChange('otherToothBrushingFrequency')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Do you have a toothbrush and toothpaste? If so, where did you get them from?
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={values.toothbrushAndToothpasteSource ?? ''}
        onChangeText={handleChange('toothbrushAndToothpasteSource')}
        editable={!disabled}
      />
      <Text style={styles.question}>If not, why do you not have a toothbrush or toothpaste?</Text>
      <CheckboxGroup
        name="noToothbrushOrToothpasteReasons"
        options={[
          'Too expensive',
          'Do not know where to buy',
          'Seems unnecessary',
          'Have homemade alternatives',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherNoToothbrushOrToothpasteReasons"
        otherValue={values.otherNoToothbrushOrToothpasteReasons ?? undefined}
        onOtherChange={handleChange('otherNoToothbrushOrToothpasteReasons')}
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
});
