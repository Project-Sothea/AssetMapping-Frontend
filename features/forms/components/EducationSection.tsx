import { View, Text, StyleSheet, TextInput } from 'react-native';

import { FormValues } from '../types';

import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

const EDUCATION_EXTRA_OPTIONS = ['Taking medications', "I don't know", 'Others'];

interface EducationSectionProps {
  values: FormValues;
  setFieldValue: (field: keyof FormValues, value: FormValues[keyof FormValues]) => void;
  handleChange: (field: keyof FormValues) => (value: string) => void;
  disabled?: boolean;
}

export default function EducationSection({
  values,
  setFieldValue,
  handleChange,
  disabled = false,
}: EducationSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.subheading}>Diarrhoea</Text>
      <Text style={styles.question}>What is diarrhoea?</Text>
      <CheckboxGroup
        name="diarrhoeaDefinition"
        options={[
          'Back pain',
          'Watery and loose stools',
          'Nose bleed',
          'Hearing loss',
          'Toothache',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiarrhoeaDefinition"
        otherValue={values.otherDiarrhoeaDefinition ?? undefined}
        onOtherChange={handleChange('otherDiarrhoeaDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>What should you do if you have diarrhoea?</Text>
      <CheckboxGroup
        name="diarrhoeaActions"
        options={[
          'Stop drinking water',
          'Drink more water',
          'Eat cold foods',
          'Drink alcohol',
          'Exercise more',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiarrhoeaActions"
        otherValue={values.otherDiarrhoeaActions ?? undefined}
        onOtherChange={handleChange('otherDiarrhoeaActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Common Cold</Text>
      <Text style={styles.question}>How does a common cold present?</Text>
      <CheckboxGroup
        name="commonColdSymptoms"
        options={[
          'Coughing, runny nose, sore throat, fever',
          'Diarrhoea',
          'Eye swelling',
          'Bloody stools',
          'Ringing in the ears',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherCommonColdSymptoms"
        otherValue={values.otherCommonColdSymptoms ?? undefined}
        onOtherChange={handleChange('otherCommonColdSymptoms')}
        disabled={disabled}
      />

      <Text style={styles.question}>If you have a common cold, what should you do?</Text>
      <CheckboxGroup
        name="commonColdActions"
        options={[
          'Drink more cold water',
          'Cover your mouth when coughing/sneezing',
          'Stand in the rain',
          'Exercise strenuously',
          'Wear a mask to prevent infection spread',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherCommonColdActions"
        otherValue={values.otherCommonColdActions ?? undefined}
        onOtherChange={handleChange('otherCommonColdActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>MSK</Text>
      <Text style={styles.question}>What is a musculoskeletal injury?</Text>
      <CheckboxGroup
        name="mskInjuryDefinition"
        options={[
          'Aching and stiffness',
          'Headache',
          'Hand tremors',
          'Constipation',
          'Blurry vision',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherMskInjuryDefinition"
        otherValue={values.otherMskInjuryDefinition ?? undefined}
        onOtherChange={handleChange('otherMskInjuryDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>How should you manage a musculoskeletal injury?</Text>
      <CheckboxGroup
        name="mskInjuryActions"
        options={[
          'Prevent exertion',
          'Get medical help',
          'Increase movement',
          'Press aggressively',
          'Gently rotate the joint (if not very painful)',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherMskInjuryActions"
        otherValue={values.otherMskInjuryActions ?? undefined}
        onOtherChange={handleChange('otherMskInjuryActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Hypertension</Text>
      <Text style={styles.question}>What is hypertension?</Text>
      <CheckboxGroup
        name="hypertensionDefinition"
        options={[
          'High blood sugar',
          'High blood pressure',
          'High blood fat',
          'Stomach pain',
          'Headache',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHypertensionDefinition"
        otherValue={values.otherHypertensionDefinition ?? undefined}
        onOtherChange={handleChange('otherHypertensionDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>If you have hypertension, what should you do?</Text>
      <CheckboxGroup
        name="hypertensionActions"
        options={[
          'Exercise more',
          'Eat less salty food',
          'Eat more fried food',
          'Drink more coffee',
          'Eat more fruits/vegetables',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHypertensionActions"
        otherValue={values.otherHypertensionActions ?? undefined}
        onOtherChange={handleChange('otherHypertensionActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Healthy Eating</Text>
      <Text style={styles.question}>
        How often do you eat healthy food — for example, food that is not too salty, not too oily,
        and includes vegetables and fruits?
      </Text>
      <RadioGroup
        name="healthyFoodFrequency"
        options={[
          { label: 'Yes, most of the time (5-7 days a week)', value: 'most_of_the_time' },
          { label: 'Sometimes (2-4 days a week)', value: 'sometimes' },
          { label: 'No, not really', value: 'no_not_really' },
          { label: 'Taking medications', value: 'taking_medications' },
          { label: "I don't know", value: 'do_not_know' },
          { label: 'Others', value: 'others' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHealthyFoodFrequency"
        otherValue={values.otherHealthyFoodFrequency ?? undefined}
        onOtherChange={handleChange('otherHealthyFoodFrequency')}
        disabled={disabled}
      />

      <Text style={styles.question}>If you often do not eat healthy food, why not?</Text>
      <CheckboxGroup
        name="unhealthyFoodReasons"
        options={[
          'Healthy food is too expensive',
          "It's hard to find in the village",
          "I don't have time to cook/get healthy food",
          'I prefer salty or oily food',
          "I don't know what foods are healthy",
          'I eat healthily most of the time',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherUnhealthyFoodReasons"
        otherValue={values.otherUnhealthyFoodReasons ?? undefined}
        onOtherChange={handleChange('otherUnhealthyFoodReasons')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Cholesterol</Text>
      <Text style={styles.question}>What is high cholesterol?</Text>
      <CheckboxGroup
        name="highCholesterolDefinition"
        options={[
          'High blood sugar',
          'High blood pressure',
          'High blood fat',
          'Stomach pain',
          'Headache',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHighCholesterolDefinition"
        otherValue={values.otherHighCholesterolDefinition ?? undefined}
        onOtherChange={handleChange('otherHighCholesterolDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>If you have high cholesterol, what should you do?</Text>
      <CheckboxGroup
        name="highCholesterolActions"
        options={[
          'Rest more by increasing sedentary activity',
          'Decreasing intake of fatty foods and sugary drinks',
          'Try to lose weight to stay within the healthy range',
          'Quit smoking',
          'Stop consuming fruits and vegetables',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHighCholesterolActions"
        otherValue={values.otherHighCholesterolActions ?? undefined}
        onOtherChange={handleChange('otherHighCholesterolActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Diabetes</Text>
      <Text style={styles.question}>What is diabetes?</Text>
      <CheckboxGroup
        name="diabetesDefinition"
        options={[
          'High blood sugar',
          'High blood pressure',
          'High blood fat',
          'Stomach pain',
          'Headache',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiabetesDefinition"
        otherValue={values.otherDiabetesDefinition ?? undefined}
        onOtherChange={handleChange('otherDiabetesDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>If you have diabetes, what should you do?</Text>
      <CheckboxGroup
        name="diabetesActions"
        options={[
          'Drink sweet drinks',
          'Exercise regularly',
          'Eat more fried food',
          'Avoid skipping meals',
          'Drink alcohol',
          ...EDUCATION_EXTRA_OPTIONS,
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiabetesActions"
        otherValue={values.otherDiabetesActions ?? undefined}
        onOtherChange={handleChange('otherDiabetesActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Others</Text>

      <Text style={styles.question}>What other areas are you interested in learning about?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={values.otherLearningAreas ?? ''}
        onChangeText={handleChange('otherLearningAreas')}
        editable={!disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subheading: {
    fontWeight: '600',
    fontSize: 17,
    marginTop: 14,
    marginBottom: 6,
    color: '#444',
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
});
