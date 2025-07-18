import React from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Button } from 'react-native';
import Checkbox from 'expo-checkbox';
import RadioForm from 'react-native-simple-radio-button';
import { Formik } from 'formik';
import * as Yup from 'yup';

const options = {
  yesNo: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
  ],
  yesNoDontWant: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: "Don't want to come", value: 'dontWant' },
  ],
    knowDoctor: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: "I don't find a doctor", value: 'noFind' },
  ],
  povertyCard: [
    { label: 'Yes and I use it', value: 'use' },
    { label: "Yes but I don't use it", value: 'noUse' },
    { label: 'No', value: 'no' },
  ],
};

type FormProps = { onClose: () => void };

const initialValues = {
  village: '',
  villageId: '',
  canAttend: '',
  longTermConditions: [] as string[],
  otherCondition: '',
  conditionDetails: '',
  managementMethods: [] as string[],
  otherManagement: '',
  whatDoWhenSick: [] as string[],
  otherSickAction: '',
  knowDoctor: '',
  ownTransport: '',
  whereBuyMedicine: '',
  otherBuyMedicine: '',
  povertyCard: '',
  brushTeeth: '',
  otherBrushTeeth: '',
  haveToothbrush: '',
  diarrhoea: '',
  diarrhoeaAction: '',
  coldLookLike: '',
  coldAction: [] as string[],
  mskInjury: '',
  mskAction: [] as string[],
  hypertension: '',
  hypertensionAction: [] as string[],
  cholesterol: '',
  cholesterolAction: [] as string[],
  diabetes: '',
  diabetesAction: [] as string[],
  handBeforeMeal: '',
  handAfterToilet: '',
  eatCleanFood: '',
  otherLearning: '',
  waterSources: [] as string[],
  otherWaterSource: '',
  unsafeWater: [] as string[],
  knowWaterFilters: '',
  notUsingWaterFilter: [] as string[],
  otherWaterFilterReason: '',
};

const validationSchema = Yup.object().shape({
  village: Yup.string().required('Required'),
  villageId: Yup.string().required('Required'),
  managementMethods: Yup.array().min(1, 'Please select at least one option'),
  whatDoWhenSick: Yup.array().min(1, 'Please select at least one option'),
  knowDoctor: Yup.string().required('Required'),
  ownTransport: Yup.string().required('Required'),
  whereBuyMedicine: Yup.string().required('Required'),
  povertyCard: Yup.string().required('Required'),
  brushTeeth: Yup.string().required('Required'),
});

export default function Form({ onClose }: FormProps) {
  const handleCheckbox = (value: string, array: string[], setFieldValue: Function, field: string) => {
    if (array.includes(value)) {
      setFieldValue(field, array.filter((v) => v !== value));
    } else {
      setFieldValue(field, [...array, value]);
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        console.log('Submitted:', values);
      }}
    >
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
        <ScrollView style={styles.container}>
          <Button title="Cancel" color="red" onPress={onClose} />

          <Text style={styles.heading}>General</Text>
          <Text>Which village are you from?*</Text>
          <RadioForm
            radio_props={[{ label: 'KS', value: 'KS' }, { label: 'SO', value: 'SO' }]}
            initial={-1}
            onPress={(val: any) => setFieldValue('village', val)}
          />
          {errors.village && touched.village && <Text style={styles.error}>{errors.village}</Text>}

          <Text>What is your village identifier number?*</Text>
          <TextInput
            style={styles.input}
            onChangeText={handleChange('villageId')}
            onBlur={handleBlur('villageId')}
            value={values.villageId}
            placeholder="e.g. A1, B2"
          />
          {errors.villageId && touched.villageId && <Text style={styles.error}>{errors.villageId}</Text>}

          <Text>Are you physically able to attend our health screening in December?</Text>
          <RadioForm
            radio_props={options.yesNoDontWant}
            initial={-1}
            onPress={(val: any) => setFieldValue('canAttend', val)}
          />

          <Text style={styles.heading}>Health</Text>
          <Text>Do you have any long-term conditions?</Text>
          {[ 'MSK Conditions', 'GI Conditions', 'Eye/Visual Acuity', 'Hypertension', 'High Cholesterol', 'Neurological', "Don't have any", 'Other' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.longTermConditions.includes(opt)}
                onValueChange={() => handleCheckbox(opt, values.longTermConditions, setFieldValue, 'longTermConditions')}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          {values.longTermConditions.includes('Other') && (
            <TextInput
              style={styles.input}
              placeholder="Please specify"
              value={values.otherCondition}
              onChangeText={handleChange('otherCondition')}
            />
          )}

          <Text>If yes, please specify.</Text>
          <TextInput
            style={styles.input}
            value={values.conditionDetails}
            onChangeText={handleChange('conditionDetails')}
            multiline
          />

          <Text>How do you manage your condition?</Text>
          {["Go to the doctor's", 'Get medicine', 'I do not manage', "I don't know how to manage", 'Other'].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.managementMethods.includes(opt)}
                onValueChange={() => {
                  const newValue = values.managementMethods.includes(opt)
                    ? values.managementMethods.filter((o) => o !== opt)
                    : [...values.managementMethods, opt];
                  setFieldValue('managementMethods', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}
          {values.managementMethods.includes('Other') && (
            <TextInput
              style={styles.input}
              placeholder="Please specify"
              value={values.otherManagement}
              onChangeText={handleChange('otherManagement')}
            />
          )}

          <Text>What do you do when you are sick and Project Sothea is not around to help?</Text>
          {["Don't do anything", 'Seek medical help', 'Take herbal or traditional medicine available in the village', 'Other'].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.whatDoWhenSick.includes(opt)}
                onValueChange={() => {
                  const newValue = values.whatDoWhenSick.includes(opt)
                    ? values.whatDoWhenSick.filter((o) => o !== opt)
                    : [...values.whatDoWhenSick, opt];
                  setFieldValue('whatDoWhenSick', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}
          {values.whatDoWhenSick.includes('Other') && (
            <TextInput
              style={styles.input}
              placeholder="Please specify"
              value={values.otherSickAction}
              onChangeText={handleChange('otherSickAction')}
            />
          )}

          <Text>Do you know where to find a doctor if you are not feeling well?</Text>
          <RadioForm
            radio_props={options.knowDoctor}
            initial={-1}
            onPress={(val: any) => setFieldValue('knowDoctor', val)}
          />

          <Text>Do you have own means of transport to visit a clinic when you are unwell?</Text>
          <RadioForm
            radio_props={options.yesNo}
            initial={-1}
            onPress={(val: any) => setFieldValue('ownTransport', val)}
          />

          <Text>Where do you go to buy your medicine?</Text>
          {['Pharmacy', "I don't know where to go", "I don't wish to buy medicine", 'Other'].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.whereBuyMedicine === opt}
                onValueChange={() => setFieldValue('whereBuyMedicine', opt)}
              />
              <Text>{opt}</Text>
            </View>
          ))}
          {values.whereBuyMedicine === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Please specify"
              value={values.otherBuyMedicine}
              onChangeText={handleChange('otherBuyMedicine')}
            />
          )}

          <Text>Do you know what the poverty card scheme is about?</Text>
          <RadioForm
            radio_props={options.povertyCard}
            initial={-1}
            onPress={(val: any) => setFieldValue('povertyCard', val)}
          />

          <Text>Do you brush your teeth?</Text>
          {['Yes twice a day', 'Yes once a day', 'No', 'Other'].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.brushTeeth === opt}
                onValueChange={() => setFieldValue('brushTeeth', opt)}
              />
              <Text>{opt}</Text>
            </View>
          ))}
          {values.brushTeeth === 'Other' && (
            <TextInput
              style={styles.input}
              placeholder="Please specify"
              value={values.otherBrushTeeth}
              onChangeText={handleChange('otherBrushTeeth')}
            />
          )}

          <Text>Do you have a toothbrush? If so, where did you get it from?</Text>
          <TextInput
            style={styles.input}
            placeholder="Your answer"
            value={values.haveToothbrush}
            onChangeText={handleChange('haveToothbrush')}
          />
           
          <Text>What is diarrhoea?</Text>
          {[ 'Back pain', 'Water and loose stools', 'Nose bleed', 'Hearing loss', 'Toothache', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.diarrhoea === opt} onValueChange={() => setFieldValue('diarrhoea', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What should I do if I have diarrhoea?</Text>
          {[ 'Stop drinking water', 'Drink more water', 'Eat cold foods', 'Drink alcohol', 'Exercise more', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.diarrhoeaAction === opt} onValueChange={() => setFieldValue('diarrhoeaAction', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>How does a common cold look like?</Text>
          {[ 'Coughing & runny nose & sore throat & fever', 'Diarrhoea', 'Eye swelling', 'Bloody stools', 'Ringing in the ears', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.coldLookLike === opt} onValueChange={() => setFieldValue('coldLookLike', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>If I have a common cold, what should I do?</Text>
          {[ 'Drink more cold water', 'Cover my mouth when I cough and sneeze', 'Stand in the rain', 'Engage in strenuous exercise', 'Wear a mask to prevent spread of infection', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.coldAction.includes(opt)}
                onValueChange={() => {
                  const newValue = values.coldAction.includes(opt)
                    ? values.coldAction.filter((o) => o !== opt)
                    : [...values.coldAction, opt];
                  setFieldValue('coldAction', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What is a musculoskeletal related injury?</Text>
          {[ 'Aching and stiffness', 'Headache', 'Hand tremors', 'Constipation', 'Blurry vision', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.mskInjury === opt} onValueChange={() => setFieldValue('mskInjury', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>How should I approach my musculoskeletal injury?</Text>
          {[ 'Prevent exertion with exercise', 'Get medical help', 'Increase movement', 'Press aggressively on the area of pain', 'Gently rotate the joint (if not severely painful) a few times a day', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.mskAction.includes(opt)}
                onValueChange={() => {
                  const newValue = values.mskAction.includes(opt)
                    ? values.mskAction.filter((o) => o !== opt)
                    : [...values.mskAction, opt];
                  setFieldValue('mskAction', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What is hypertension?</Text>
          {[ 'High blood sugar', 'High blood pressure', 'High blood fat', 'Stomach pain', 'Headache', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.hypertension === opt} onValueChange={() => setFieldValue('hypertension', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What should I do if I have been diagnosed with hypertension?</Text>
          {[ 'Exercise more', 'Eat less salty food', 'Eat more fried food', 'Consume more coffee', 'Consume more fruits and vegetables', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.hypertensionAction.includes(opt)}
                onValueChange={() => {
                  const newValue = values.hypertensionAction.includes(opt)
                    ? values.hypertensionAction.filter((o) => o !== opt)
                    : [...values.hypertensionAction, opt];
                  setFieldValue('hypertensionAction', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What is high cholesterol?</Text>
          {[ 'High blood sugar', 'High blood pressure', 'High blood fat', 'Stomach pain', 'Headache', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.cholesterol === opt} onValueChange={() => setFieldValue('cholesterol', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What should I do if I have been diagnosed with high cholesterol?</Text>
          {[ 'Rest more by increasing sedentary activity', 'Decrease intake of fatty foods and sugary drinks', 'Try to lose weight to stay within the healthy range', 'Quit smoking', 'Stop consuming fruits and vegetables' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.cholesterolAction.includes(opt)}
                onValueChange={() => {
                  const newValue = values.cholesterolAction.includes(opt)
                    ? values.cholesterolAction.filter((o) => o !== opt)
                    : [...values.cholesterolAction, opt];
                  setFieldValue('cholesterolAction', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What is diabetes?</Text>
          {[ 'High blood sugar', 'High blood pressure', 'High blood fat', 'Stomach pain', 'Headache', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.diabetes === opt} onValueChange={() => setFieldValue('diabetes', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What should I do if I have been diagnosed with diabetes?</Text>
          {[ 'Drink sweet drinks', 'Regular exercise', 'Consume more fried food', 'Avoid skipping meals', 'Consume more alcohol' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.diabetesAction.includes(opt)}
                onValueChange={() => {
                  const newValue = values.diabetesAction.includes(opt)
                    ? values.diabetesAction.filter((o) => o !== opt)
                    : [...values.diabetesAction, opt];
                  setFieldValue('diabetesAction', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>Do you wash your hands before meals?</Text>
          {[ 'Yes', 'No' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.handBeforeMeal === opt} onValueChange={() => setFieldValue('handBeforeMeal', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>Do you wash your hands after using the toilet?</Text>
          {[ 'Yes', 'No' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
                <Checkbox value={values.handAfterToilet === opt} onValueChange={() => setFieldValue('handAfterToilet', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>Eating well-cooked and clean food is important in maintaining my health.</Text>
          {[ 'Agree', 'Disagree' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.eatCleanFood === opt} onValueChange={() => setFieldValue('eatCleanFood', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>What other areas are you interested in learning about?</Text>
          <TextInput
            style={styles.input}
            value={values.otherLearning}
            onChangeText={handleChange('otherLearning')}
            placeholder="Enter areas..."
          />

          <Text style={styles.heading}>Water</Text>

          <Text>Where do you get water for your daily use?</Text>
          {[ 'Boiled water', 'Filtered water', 'Bottled water', 'Rainwater', 'Lake water', 'Others' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.waterSources.includes(opt)}
                onValueChange={() => {
                  const newValue = values.waterSources.includes(opt)
                    ? values.waterSources.filter((o) => o !== opt)
                    : [...values.waterSources, opt];
                  setFieldValue('waterSources', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}
          {values.waterSources.includes('Others') && (
            <TextInput
              style={styles.input}
              value={values.otherWaterSource}
              onChangeText={handleChange('otherWaterSource')}
              placeholder="Please specify other water sources"
            />
          )}

          <Text>What kinds of water do you think are NOT safe for drinking?</Text>
          {[ 'Unboiled water', 'Rainwater', 'Lake water', 'Water with visible dirt or debris', 'Water stored in open container for a long time', 'Unclean water is SAFE to drink', "I don't know" ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.unsafeWater.includes(opt)}
                onValueChange={() => {
                  const newValue = values.unsafeWater.includes(opt)
                    ? values.unsafeWater.filter((o) => o !== opt)
                    : [...values.unsafeWater, opt];
                  setFieldValue('unsafeWater', newValue);
                }}
              />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>Do you know what water filters are?</Text>
          {[ 'Yes', 'No' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox value={values.knowWaterFilters === opt} onValueChange={() => setFieldValue('knowWaterFilters', opt)} />
              <Text>{opt}</Text>
            </View>
          ))}

          <Text>Are there any reasons you would not use a water filter?</Text>
          {[ 'I have a water filter', 'Cost', 'Inconvenience', 'Water tastes bad', 'Water filters are unavailable', 'Water filter does not last very long', 'Others' ].map((opt) => (
            <View key={opt} style={styles.checkboxContainer}>
              <Checkbox
                value={values.notUsingWaterFilter.includes(opt)}
                onValueChange={() => {
                  const newValue = values.notUsingWaterFilter.includes(opt)
                    ? values.notUsingWaterFilter.filter((o) => o !== opt)
                    : [...values.notUsingWaterFilter, opt];
                  setFieldValue('notUsingWaterFilter', newValue);
                }}
            />
              <Text>{opt}</Text>
            </View>
          ))}
          {values.notUsingWaterFilter.includes('Others') && (
            <TextInput
              style={styles.input}
              value={values.otherWaterFilterReason}
              onChangeText={handleChange('otherWaterFilterReason')}
              placeholder="Please specify"
            />
          )}

          <Button title="Submit" onPress={() => handleSubmit()} />
          <Button title="Cancel" color="red" onPress={onClose} />
        </ScrollView>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 20,
  },
  input: {
    borderColor: '#aaa',
    borderWidth: 1,
    padding: 8,
    marginBottom: 12,
    borderRadius: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
