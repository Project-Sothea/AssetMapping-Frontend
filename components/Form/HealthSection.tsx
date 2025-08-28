import { View, Text, TextInput, StyleSheet } from 'react-native';
import CheckboxGroup from './CheckboxGroup';
import RadioGroup from './RadioGroup';

export default function HealthSection({
  values,
  setFieldValue,
  handleChange,
  errors,
  touched,
}: any) {
  return (
    <View>
      <Text style={styles.heading}>Health</Text>

      <Text style={styles.question}>Do you have any long-term conditions?</Text>
      <CheckboxGroup
        name="longTermConditions"
        options={[
          'MSK Conditions',
          'GI Conditions',
          'Eye/Visual Acuity',
          'Hypertension',
          'High Cholesterol',
          'Neurological',
          "Don't have any",
          'Other',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherCondition"
        otherValue={values.otherCondition}
        onOtherChange={handleChange('otherCondition')}
      />

      <Text style={styles.question}>If yes, please specify.</Text>
      <TextInput
        style={styles.input}
        value={values.conditionDetails}
        onChangeText={handleChange('conditionDetails')}
        multiline
      />

      <Text style={styles.question}>How do you manage your condition?</Text>
      <CheckboxGroup
        name="managementMethods"
        options={[
          "Go to the doctor's",
          'Get medicine',
          'I do not manage',
          "I don't know how to manage",
          'Other',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherManagement"
        otherValue={values.otherManagement}
        onOtherChange={handleChange('otherManagement')}
      />

      <Text style={styles.question}>What do you do when you are sick and Project Sothea is not around to help?</Text>
      <CheckboxGroup
        name="whatDoWhenSick"
        options={[
          "Don't do anything",
          'Seek medical help',
          'Take herbal or traditional medicine available in the village',
          'Other',
        ]}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherSickAction"
        otherValue={values.otherSickAction}
        onOtherChange={handleChange('otherSickAction')}
      />

      <Text style={styles.question}>Do you know where to find a doctor if you are not feeling well?</Text>
      <RadioGroup
        name="knowDoctor"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: "I don't find a doctor", value: 'noFind' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>Do you have own means of transport to visit a clinic when you are unwell?</Text>
      <RadioGroup
        name="ownTransport"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>Where do you go to buy your medicine?</Text>
      <CheckboxGroup
        name="whereBuyMedicine"
        options={['Pharmacy', "I don't know where to go", "I don't wish to buy medicine", 'Other']}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherBuyMedicine"
        otherValue={values.otherBuyMedicine}
        onOtherChange={handleChange('otherBuyMedicine')}
      />

      <Text style={styles.question}>Do you know what the poverty card scheme is about?</Text>
      <RadioGroup
        name="povertyCard"
        options={[
          { label: 'Yes and I use it', value: 'use' },
          { label: "Yes but I don't use it", value: 'noUse' },
          { label: 'No', value: 'no' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>Do you brush your teeth?</Text>
      <CheckboxGroup
        name="brushTeeth"
        options={['Yes twice a day', 'Yes once a day', 'No', 'Other']}
        values={values}
        setFieldValue={setFieldValue}
        otherFieldName="otherBrushTeeth"
        otherValue={values.otherBrushTeeth}
        onOtherChange={handleChange('otherBrushTeeth')}
      />

      <Text style={styles.question}>Do you have a toothbrush? If so, where did you get it from?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={values.haveToothbrush}
        onChangeText={handleChange('haveToothbrush')}
      />

      <Text style={styles.subheading}>Diarrhoea</Text>
      <Text style={styles.question}>What is diarrhoea?</Text>
      <CheckboxGroup
        name="diarrhoea"
        options={[
          'Back pain',
          'Water and loose stools',
          'Nose bleed',
          'Hearing loss',
          'Toothache',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>What should I do if I have diarrhoea?</Text>
      <CheckboxGroup
        name="diarrhoeaAction"
        options={[
          'Stop drinking water',
          'Drink more water',
          'Eat cold foods',
          'Drink alcohol',
          'Exercise more',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.subheading}>Common Cold</Text>
      <Text style={styles.question}>How does a common cold look like?</Text>
      <CheckboxGroup
        name="coldLookLike"
        options={[
          'Coughing & runny nose & sore throat & fever',
          'Diarrhoea',
          'Eye swelling',
          'Bloody stools',
          'Ringing in the ears',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>If I have a common cold, what should I do?</Text>
      <CheckboxGroup
        name="coldAction"
        options={[
          'Drink more cold water',
          'Cover my mouth when I cough and sneeze',
          'Stand in the rain',
          'Engage in strenuous exercise',
          'Wear a mask to prevent spread of infection',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.subheading}>MSK</Text>
      <Text style={styles.question}>What is a musculoskeletal related injury?</Text>
      <CheckboxGroup
        name="mskInjury"
        options={[
          'Aching and stiffness',
          'Headache',
          'Hand tremors',
          'Constipation',
          'Blurry vision',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>How should I approach my musculoskeletal injury?</Text>
      <CheckboxGroup
        name="mskAction"
        options={[
          'Prevent exertion with exercise',
          'Get medical help',
          'Increase movement',
          'Press aggressively on the area of pain',
          'Gently rotate the joint (if not severely painful) a few times a day',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.subheading}>Hypertension</Text>
      <Text style={styles.question}>What is hypertension?</Text>
      <CheckboxGroup
        name="hypertension"
        options={[
          'High blood sugar',
          'High blood pressure',
          'High blood fat',
          'Stomach pain',
          'Headache',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>What should I do if I have been diagnosed with hypertension?</Text>
      <CheckboxGroup
        name="hypertensionAction"
        options={[
          'Exercise more',
          'Eat less salty food',
          'Eat more fried food',
          'Consume more coffee',
          'Consume more fruits and vegetables',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.subheading}>Cholesterol</Text>
      <Text style={styles.question}>What is high cholesterol?</Text>
      <CheckboxGroup
        name="cholesterol"
        options={[
          'High blood sugar',
          'High blood pressure',
          'High blood fat',
          'Stomach pain',
          'Headache',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>What should I do if I have been diagnosed with high cholesterol?</Text>
      <CheckboxGroup
        name="cholesterolAction"
        options={[
          'Rest more by increasing sedentary activity',
          'Decrease intake of fatty foods and sugary drinks',
          'Try to lose weight to stay within the healthy range',
          'Quit smoking',
          'Stop consuming fruits and vegetables',
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.subheading}>Diabetes</Text>
      <Text style={styles.question}>What is diabetes?</Text>
      <CheckboxGroup
        name="diabetes"
        options={[
          'High blood sugar',
          'High blood pressure',
          'High blood fat',
          'Stomach pain',
          'Headache',
          "I don't know",
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>What should I do if I have been diagnosed with diabetes?</Text>
      <CheckboxGroup
        name="diabetesAction"
        options={[
          'Drink sweet drinks',
          'Regular exercise',
          'Consume more fried food',
          'Avoid skipping meals',
          'Consume more alcohol',
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.subheading}>Hygiene & Others</Text>
      <Text style={styles.question}>Do you wash your hands before meals?</Text>
      <CheckboxGroup
        name="handBeforeMeal"
        options={['Yes', 'No']}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>Do you wash your hands after using the toilet?</Text>
      <CheckboxGroup
        name="handAfterToilet"
        options={['Yes', 'No']}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>Eating well-cooked and clean food is important in maintaining my health.</Text>
      <CheckboxGroup
        name="eatCleanFood"
        options={['Agree', 'Disagree']}
        values={values}
        setFieldValue={setFieldValue}
      />

      <Text style={styles.question}>What else would you like to learn?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={values.otherLearning}
        onChangeText={handleChange('otherLearning')}
        multiline
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
  subheading: {
    fontWeight: '600',
    fontSize: 17,
    marginTop: 14,
    marginBottom: 6,
    color: '#444'
  },
  question: {
    fontSize: 16,
    fontWeight: "500",
    marginVertical: 6,
    color: "#333"
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
