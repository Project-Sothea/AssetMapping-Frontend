import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, Button } from 'react-native';
import Checkbox from 'expo-checkbox';
import RadioForm from 'react-native-simple-radio-button';

type FormProps = {
  pin: any; // or you can type it properly if you know the shape
  onClose: () => void;
};

const Form: React.FC<FormProps> = ({ pin, onClose }) => {

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
    };

  // Section 1: General
  const [village, setVillage] = useState('');
  const [villageId, setVillageId] = useState('');
  const [canAttend, setCanAttend] = useState('');

  // Section 2: Health
  const [longTermConditions, setLongTermConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [conditionDetails, setConditionDetails] = useState('');
  const [managementMethods, setManagementMethods] = useState<string[]>([]);
  const [otherManagement, setOtherManagement] = useState('');
  const [whatDoWhenSick, setWhatDoWhenSick] = useState<string[]>([]);
  const [otherSickAction, setOtherSickAction] = useState('');
  const [knowDoctor, setKnowDoctor] = useState('');
  const [ownTransport, setOwnTransport] = useState('');
  const [whereBuyMedicine, setWhereBuyMedicine] = useState('');
  const [otherBuyMedicine, setOtherBuyMedicine] = useState('');
  const [povertyCard, setPovertyCard] = useState('');
  const [brushTeeth, setBrushTeeth] = useState('');
  const [otherBrushTeeth, setOtherBrushTeeth] = useState('');
  const [haveToothbrush, setHaveToothbrush] = useState('');

  // Section 3: Education
  const [diarrhoea, setDiarrhoea] = useState('');
  const [diarrhoeaAction, setDiarrhoeaAction] = useState('');
  const [coldLookLike, setColdLookLike] = useState('');
  const [coldAction, setColdAction] = useState<string[]>([]);
  const [mskInjury, setMskInjury] = useState('');
  const [mskAction, setMskAction] = useState<string[]>([]);
  const [hypertension, setHypertension] = useState('');
  const [hypertensionAction, setHypertensionAction] = useState<string[]>([]);
  const [cholesterol, setCholesterol] = useState('');
  const [cholesterolAction, setCholesterolAction] = useState<string[]>([]);
  const [diabetes, setDiabetes] = useState('');
  const [diabetesAction, setDiabetesAction] = useState<string[]>([]);
  const [handBeforeMeal, setHandBeforeMeal] = useState('');
  const [handAfterToilet, setHandAfterToilet] = useState('');
  const [eatCleanFood, setEatCleanFood] = useState('');
  const [otherLearning, setOtherLearning] = useState('');

  // Section 4: Water
  const [waterSources, setWaterSources] = useState<string[]>([]);
  const [otherWaterSource, setOtherWaterSource] = useState('');
  const [unsafeWater, setUnsafeWater] = useState<string[]>([]);
  const [knowWaterFilters, setKnowWaterFilters] = useState('');
  const [notUsingWaterFilter, setNotUsingWaterFilter] = useState<string[]>([]);
  const [otherWaterFilterReason, setOtherWaterFilterReason] = useState('');

  const handleCheckbox = (value: string, state: string[], setter: (val: string[]) => void) => {
    if (state.includes(value)) {
      setter(state.filter((item) => item !== value));
    } else {
      setter([...state, value]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>General</Text>
      <Text>Which village are you from?*</Text>
      <RadioForm
        radio_props={[{ label: 'KS', value: 'KS' }, { label: 'SO', value: 'SO' }]}
        initial={-1}
        onPress={(val: string) => setVillage(val)}
      />

      <Text>What is your village identifier number?*</Text>
      <TextInput style={styles.input} value={villageId} onChangeText={setVillageId} placeholder="e.g. A1, B2" />

      <Text>Are you physically able to attend our health screening in December?</Text>
      <RadioForm
        radio_props={options.yesNoDontWant}
        initial={-1}
        onPress={(val: string) => setCanAttend(val)}
      />

      <Text style={styles.heading}>Health</Text>
      <Text>Do you have any long-term conditions?</Text>
      {[
        'MSK Conditions', 'GI Conditions', 'Eye/Visual Acuity', 'Hypertension', 'High Cholesterol',
        'Neurological', "Don't have any", 'Other'
      ].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox value={longTermConditions.includes(opt)} onValueChange={() => handleCheckbox(opt, longTermConditions, setLongTermConditions)} />
          <Text>{opt}</Text>
        </View>
      ))}
      {longTermConditions.includes('Other') && (
        <TextInput style={styles.input} placeholder="Please specify" value={otherCondition} onChangeText={setOtherCondition} />
      )}

      <Text>If yes, please specify.</Text>
      <TextInput style={styles.input} value={conditionDetails} onChangeText={setConditionDetails} multiline />

      <Text>How do you manage your condition?</Text>
      {['Go to the doctor\'s', 'Get medicine', 'I do not manage', "I don't know how to manage", 'Other'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={managementMethods.includes(opt)}
            onValueChange={() => handleCheckbox(opt, managementMethods, setManagementMethods)}
          />
          <Text>{opt}</Text>
        </View>
      ))}
      {managementMethods.includes('Other') && (
        <TextInput style={styles.input} placeholder="Please specify" value={otherManagement} onChangeText={setOtherManagement} />
      )}

      <Text>What do you do when you are sick and Project Sothea is not around to help?</Text>
      {['Don\'t do anything', 'Seek medical help', 'Take herbal or traditional medicine available in the village', 'Other'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox value={whatDoWhenSick.includes(opt)} onValueChange={() => handleCheckbox(opt, whatDoWhenSick, setWhatDoWhenSick)} />
          <Text>{opt}</Text>
        </View>
      ))}
      {whatDoWhenSick.includes('Other') && (
        <TextInput style={styles.input} placeholder="Please specify" value={otherSickAction} onChangeText={setOtherSickAction} />
      )}

      <Text>Do you know where to find a doctor if you are not feeling well?</Text>
      <RadioForm
        radio_props={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }, 
            { label: "I don't find a doctor", value: 'noFind' }]}
        initial={-1}
        onPress={setKnowDoctor}
      />

      <Text>Do you have own means of transport to visit a clinic when you are unwell?</Text>
      <RadioForm radio_props={options.yesNo} initial={-1} onPress={setOwnTransport} />

      <Text>Where do you go to buy your medicine?</Text>
      {[ 'Pharmacy', "I don't know where to go", "I don't wish to buy medicine", 'Other' ].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox value={whereBuyMedicine === opt} onValueChange={() => setWhereBuyMedicine(opt)} />
          <Text>{opt}</Text>
        </View>
      ))}
      {whereBuyMedicine === 'Other' && (
        <TextInput style={styles.input} placeholder="Please specify" value={otherBuyMedicine} onChangeText={setOtherBuyMedicine} />
      )}

      <Text>Do you know what the poverty card scheme is about?</Text>
      <RadioForm
        radio_props={[{ label: 'Yes and I use it', value: 'use' }, { label: "Yes but I don't use it", value: 'noUse' }, { label: 'No', value: 'no' }]}
        initial={-1}
        onPress={setPovertyCard}
      />

      <Text>Do you brush your teeth?</Text>
      {['Yes twice a day', 'Yes once a day', 'No', 'Other'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={brushTeeth === opt}
            onValueChange={() => setBrushTeeth(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}
      {brushTeeth === 'Other' && (
        <TextInput
          style={styles.input}
          placeholder="Please specify"
          value={otherBrushTeeth}
          onChangeText={setOtherBrushTeeth}
        />
      )}

      <Text>Do you have a toothbrush? If so, where did you get it from?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your answer"
        value={haveToothbrush}
        onChangeText={setHaveToothbrush}
      />

      <Text style={styles.heading}>Education</Text>
      <Text>What is diarrhoea?</Text>
      {['Back pain', 'Water and loose stools', 'Nose bleed', 'Hearing loss', 'Toothache', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={diarrhoea === opt}
            onValueChange={() => setDiarrhoea(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What should I do if I have diarrhoea?</Text>
      {['Stop drinking water', 'Drink more water', 'Eat cold foods', 'Drink alcohol', 'Exercise more', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={diarrhoeaAction === opt}
            onValueChange={() => setDiarrhoeaAction(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>How does a common cold look like?</Text>
      {['Coughing & runny nose & sore throat & fever', 'Diarrhoea', 'Eye swelling', 'Bloody stools', 'Ringing in the ears', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={coldLookLike === opt}
            onValueChange={() => setColdLookLike(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>If I have a common cold, what should I do?</Text>
      {['Drink more cold water', 'Cover my mouth when I cough and sneeze', 'Stand in the rain', 'Engage in strenuous exercise', 'Wear a mask to prevent spread of infection', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={coldAction.includes(opt)}
            onValueChange={() => handleCheckbox(opt, coldAction, setColdAction)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What is a musculoskeletal related injury?</Text>
      {['Aching and stiffness', 'Headache', 'Hand tremors', 'Constipation', 'Blurry vision', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={mskInjury === opt}
            onValueChange={() => setMskInjury(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>How should I approach my musculoskeletal injury?</Text>
      {['Prevent exertion with exercise', 'Get medical help', 'Increase movement', 'Press aggressively on the area of pain', 'Gently rotate the joint (if not severely painful) a few times a day', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={mskAction.includes(opt)}
            onValueChange={() => handleCheckbox(opt, mskAction, setMskAction)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What is hypertension?</Text>
      {['High blood sugar', 'High blood pressure', 'High blood fat', 'Stomach pain', 'Headache', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={hypertension === opt}
            onValueChange={() => setHypertension(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What should I do if I have been diagnosed with hypertension?</Text>
      {['Exercise more', 'Eat less salty food', 'Eat more fried food', 'Consume more coffee', 'Consume more fruits and vegetables', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={hypertensionAction.includes(opt)}
            onValueChange={() => handleCheckbox(opt, hypertensionAction, setHypertensionAction)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What is high cholesterol?</Text>
      {['High blood sugar', 'High blood pressure', 'High blood fat', 'Stomach pain', 'Headache', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={cholesterol === opt}
            onValueChange={() => setCholesterol(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What should I do if I have been diagnosed with high cholesterol?</Text>
      {['Rest more by increasing sedentary activity', 'Decrease intake of fatty foods and sugary drinks', 'Try to lose weight to stay within the healthy range', 'Quit smoking', 'Stop consuming fruits and vegetables'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={cholesterolAction.includes(opt)}
            onValueChange={() => handleCheckbox(opt, cholesterolAction, setCholesterolAction)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What is diabetes?</Text>
      {['High blood sugar', 'High blood pressure', 'High blood fat', 'Stomach pain', 'Headache', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={diabetes === opt}
            onValueChange={() => setDiabetes(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What should I do if I have been diagnosed with diabetes?</Text>
      {['Drink sweet drinks', 'Regular exercise', 'Consume more fried food', 'Avoid skipping meals', 'Consume more alcohol'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={diabetesAction.includes(opt)}
            onValueChange={() => handleCheckbox(opt, diabetesAction, setDiabetesAction)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      {/* General Sanitation */}
      <Text>Do you wash your hands before meals?</Text>
      {['Yes', 'No'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={handBeforeMeal === opt}
            onValueChange={() => setHandBeforeMeal(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>Do you wash your hands after using the toilet?</Text>
      {['Yes', 'No'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={handAfterToilet === opt}
            onValueChange={() => setHandAfterToilet(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>Eating well-cooked and clean food is important in maintaining my health.</Text>
      {['Agree', 'Disagree'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={eatCleanFood === opt}
            onValueChange={() => setEatCleanFood(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>What other areas are you interested in learning about?</Text>
      <TextInput
        style={styles.input}
        value={otherLearning}
        onChangeText={setOtherLearning}
        placeholder="Enter areas..."
      />

      <Text style={styles.heading}>Water</Text>
      <Text>Where do you get water for your daily use?</Text>
      {['Boiled water', 'Filtered water', 'Bottled water', 'Rainwater', 'Lake water', 'Others'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={waterSources.includes(opt)}
            onValueChange={() => handleCheckbox(opt, waterSources, setWaterSources)}
          />
          <Text>{opt}</Text>
        </View>
      ))}
      {waterSources.includes('Others') && (
        <TextInput
          style={styles.input}
          value={otherWaterSource}
          onChangeText={setOtherWaterSource}
          placeholder="Please specify other water sources"
        />
      )}

      <Text>What kinds of water do you think are NOT safe for drinking?</Text>
      {['Unboiled water', 'Rainwater', 'Lake water', 'Water with visible dirt or debris', 'Water stored in open container for a long time', 'Unclean water is SAFE to drink', "I don't know"].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={unsafeWater.includes(opt)}
            onValueChange={() => handleCheckbox(opt, unsafeWater, setUnsafeWater)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>Do you know what water filters are?</Text>
      {['Yes', 'No'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={knowWaterFilters === opt}
            onValueChange={() => setKnowWaterFilters(opt)}
          />
          <Text>{opt}</Text>
        </View>
      ))}

      <Text>Are there any reasons you would not use a water filter?</Text>
      {['I have a water filter', 'Cost', 'Inconvenience', 'Water tastes bad', 'Water filters are unavailable', 'Water filter does not last very long', 'Others'].map((opt) => (
        <View key={opt} style={styles.checkboxContainer}>
          <Checkbox
            value={notUsingWaterFilter.includes(opt)}
            onValueChange={() => handleCheckbox(opt, notUsingWaterFilter, setNotUsingWaterFilter)}
          />
          <Text>{opt}</Text>
        </View>
      ))}
      {notUsingWaterFilter.includes('Others') && (
        <TextInput
          style={styles.input}
          value={otherWaterFilterReason}
          onChangeText={setOtherWaterFilterReason}
          placeholder="Please specify"
        />
      )}

      <Button title="Submit" onPress={() => console.log('Form submission')} />
    </ScrollView>
  );
}

export default Form;

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
    marginVertical: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
});
