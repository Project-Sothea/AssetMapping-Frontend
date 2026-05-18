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
          'Musculoskeletal (MSK)',
          'Gastrointestinal',
          'Eye/Visual Acuity',
          'Hypertension',
          'Diabetes Mellitus',
          'High Cholesterol',
          'Neurological (e.g., headache, dementia, epilepsy)',
          'No, do not have',
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
          'Go to the doctor',
          'Get medicine',
          'I do not manage it',
          "I don't know how to manage it",
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
        What do you do when you are sick and Project Sothea is not around to help?
      </Text>
      <CheckboxGroup
        name="selfCareActions"
        options={[
          'Do not do anything about it and just hope I will get better over time',
          'Seek medical help',
          'Take herbal/traditional medicine',
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
          { label: "I do not go to the doctor when I'm unwell", value: 'do_not_go' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherKnowWhereToFindDoctor"
        otherValue={values.otherKnowWhereToFindDoctor ?? undefined}
        onOtherChange={handleChange('otherKnowWhereToFindDoctor')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Do you have your own means of transport to visit a clinic?
      </Text>
      <RadioGroup
        name="transportToClinic"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
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
          'Hospital',
          'Clinic',
          'Online',
          'Village clinic',
          "Don't know",
          "I don't wish to buy medicine",
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
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherPovertyCardSchemeAwareness"
        otherValue={values.otherPovertyCardSchemeAwareness ?? undefined}
        onOtherChange={handleChange('otherPovertyCardSchemeAwareness')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        Why do you not use the poverty card even if you have it? Only ask if they have the card but
        do not use it.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={values.povertyCardNonUseReasons ?? ''}
        onChangeText={handleChange('povertyCardNonUseReasons')}
        editable={!disabled}
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
