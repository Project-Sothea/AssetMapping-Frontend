import { View, Text, StyleSheet, TextInput } from 'react-native';

import { FormValues } from '../types';

import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

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
          'Water and loose stools',
          'Nose bleed',
          'Hearing loss',
          'Toothache',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiarrhoeaDefinition"
        otherValue={values.otherDiarrhoeaDefinition ?? undefined}
        onOtherChange={handleChange('otherDiarrhoeaDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>What should I do if I have diarrhoea?</Text>
      <CheckboxGroup
        name="diarrhoeaActions"
        options={[
          'Stop drinking water',
          'Drink more water',
          'Eat cold foods',
          'Drink alcohol',
          'Exercise more',
          'I do not know what diarrhoea is',
          'I do not know what to do',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiarrhoeaActions"
        otherValue={values.otherDiarrhoeaActions ?? undefined}
        onOtherChange={handleChange('otherDiarrhoeaActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>Common Cold</Text>
      <Text style={styles.question}>How does a regular common cold present itself?</Text>
      <CheckboxGroup
        name="commonColdSymptoms"
        options={[
          'Coughing, runny nose, sore throat, fever',
          'Diarrhoea',
          'Eye swelling',
          'Bloody stools',
          'Ringing in the ears',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherCommonColdSymptoms"
        otherValue={values.otherCommonColdSymptoms ?? undefined}
        onOtherChange={handleChange('otherCommonColdSymptoms')}
        disabled={disabled}
      />

      <Text style={styles.question}>If I have a common cold, what should I do?</Text>
      <CheckboxGroup
        name="commonColdActions"
        options={[
          'Drink more cold water',
          'Cover my mouth when I cough and sneeze',
          'Stand in the rain',
          'Engage in strenuous exercise',
          'Wear a mask to prevent spread of infection',
          'I do not know what a common cold is',
          'I do not know what to do',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherCommonColdActions"
        otherValue={values.otherCommonColdActions ?? undefined}
        onOtherChange={handleChange('otherCommonColdActions')}
        disabled={disabled}
      />

      <Text style={styles.subheading}>MSK</Text>
      <Text style={styles.question}>What is a musculoskeletal related injury?</Text>
      <CheckboxGroup
        name="mskInjuryDefinition"
        options={[
          'Aching and stiffness',
          'Headache',
          'Hand tremors',
          'Constipation',
          'Blurry vision',
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherMskInjuryDefinition"
        otherValue={values.otherMskInjuryDefinition ?? undefined}
        onOtherChange={handleChange('otherMskInjuryDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>How should I approach my musculoskeletal injury?</Text>
      <CheckboxGroup
        name="mskInjuryActions"
        options={[
          'Prevent exertion with exercise',
          'Get medical help',
          'Increase movement',
          'Press aggressively on the area of pain',
          'Gently rotate the joint (if not severely painful) a few times a day',
          'I do not know what a musculoskeletal injury is',
          'I do not know what to do',
          'Others',
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
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHypertensionDefinition"
        otherValue={values.otherHypertensionDefinition ?? undefined}
        onOtherChange={handleChange('otherHypertensionDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        What should I do if I have been diagnosed with hypertension?
      </Text>
      <CheckboxGroup
        name="hypertensionActions"
        options={[
          'Exercise more',
          'Eat less salty food',
          'Eat more fried food',
          'Consume more coffee',
          'Consume more fruits and vegetables',
          'I do not know what hypertension is',
          'I do not know what to do',
          'Others',
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
          { label: 'Often (5-7 days a week)', value: 'often' },
          { label: 'Sometimes (2-4 days a week)', value: 'sometimes' },
          { label: 'Rarely (0-1 day a week)', value: 'rarely' },
          { label: 'I do not know', value: 'do_not_know' },
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
          'It is hard to find healthy food in the village',
          'I do not have time to prepare/get healthy food',
          'I prefer salty or oily food',
          'I do not know what foods are healthy',
          'Others',
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
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherHighCholesterolDefinition"
        otherValue={values.otherHighCholesterolDefinition ?? undefined}
        onOtherChange={handleChange('otherHighCholesterolDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>
        What should I do if I have been diagnosed with high cholesterol?
      </Text>
      <CheckboxGroup
        name="highCholesterolActions"
        options={[
          'Rest more by increasing sedentary activity',
          'Decrease intake of fatty foods and sugary drinks',
          'Try to lose weight to stay within the healthy range',
          'Quit smoking',
          'Stop consuming fruits and vegetables',
          'I do not know what high cholesterol is',
          'I do not know what to do',
          'Others',
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
          'I do not know',
          'Others',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherDiabetesDefinition"
        otherValue={values.otherDiabetesDefinition ?? undefined}
        onOtherChange={handleChange('otherDiabetesDefinition')}
        disabled={disabled}
      />

      <Text style={styles.question}>What should I do if I have been diagnosed with diabetes?</Text>
      <CheckboxGroup
        name="diabetesActions"
        options={[
          'Drink sweet drinks',
          'Regular exercise',
          'Consume more fried food',
          'Avoid skipping meals',
          'Consume more alcohol',
          'I do not know what diabetes is',
          'I do not know what to do',
          'Others',
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
