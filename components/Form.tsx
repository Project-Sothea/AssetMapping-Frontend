import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import { RadioButton } from 'react-native-paper';
import Checkbox from 'expo-checkbox';

export default function PinForm({ onSubmit }: { onSubmit: (formData: any) => void }) {
  const [village, setVillage] = useState('');
  const [villageId, setVillageId] = useState('');
  const [canAttend, setCanAttend] = useState('');

  const [longTermConditions, setLongTermConditions] = useState<string[]>([]);
  const [otherCondition, setOtherCondition] = useState('');
  const [conditionDetails, setConditionDetails] = useState('');

  const [managementMethods, setManagementMethods] = useState<string[]>([]);
  const [otherManagement, setOtherManagement] = useState('');

  const toggleCheckbox = (option: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(option)) {
      setList(list.filter(item => item !== option));
    } else {
      setList([...list, option]);
    }
  };

  const handleSubmit = () => {
    if (!village || !villageId) {
      Alert.alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      village,
      villageId,
      canAttend,
      longTermConditions,
      otherCondition,
      conditionDetails,
      managementMethods,
      otherManagement
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionHeader}>General</Text>

      <Text style={styles.label}>Which village are you from? *</Text>
      <RadioButton.Group onValueChange={setVillage} value={village}>
        <View style={styles.radioOption}><RadioButton value="KS" /><Text>KS</Text></View>
        <View style={styles.radioOption}><RadioButton value="SO" /><Text>SO</Text></View>
      </RadioButton.Group>

      <Text style={styles.label}>What is your village identifier number? *</Text>
      <TextInput style={styles.input} value={villageId} onChangeText={setVillageId} placeholder="e.g. A1, B1, C1" />

      <Text style={styles.label}>Are you physically able to attend our health screening in December?</Text>
      <RadioButton.Group onValueChange={setCanAttend} value={canAttend}>
        <View style={styles.radioOption}><RadioButton value="yes" /><Text>Yes</Text></View>
        <View style={styles.radioOption}><RadioButton value="no" /><Text>No</Text></View>
        <View style={styles.radioOption}><RadioButton value="dont" /><Text>Don't want to come</Text></View>
      </RadioButton.Group>

      <Text style={styles.sectionHeader}>Health</Text>

      <Text style={styles.label}>Do you have any long-term conditions?</Text>
      {['MSK Conditions', 'GI Conditions', 'Eye/Visual Acuity', 'Hypertension', 'High Cholesterol', 'Neurological', "Don't have any", 'Other'].map(option => (
        <View style={styles.checkboxRow} key={option}>
          <Checkbox value={longTermConditions.includes(option)} onValueChange={() => toggleCheckbox(option, longTermConditions, setLongTermConditions)} />
          <Text>{option}</Text>
        </View>
      ))}
      {longTermConditions.includes('Other') && (
        <TextInput style={styles.input} placeholder="Please specify" value={otherCondition} onChangeText={setOtherCondition} />
      )}

      <Text style={styles.label}>If yes to any of the above, please specify.</Text>
      <TextInput style={styles.input} value={conditionDetails} onChangeText={setConditionDetails} placeholder="Details..." multiline />

      <Text style={styles.label}>How do you manage your condition?</Text>
      {['Go to the doctor\'s', 'Get medicine', 'I do not manage', "I don't know how to manage", 'Other'].map(option => (
        <View style={styles.checkboxRow} key={option}>
          <Checkbox value={managementMethods.includes(option)} onValueChange={() => toggleCheckbox(option, managementMethods, setManagementMethods)} />
          <Text>{option}</Text>
        </View>
      ))}
      {managementMethods.includes('Other') && (
        <TextInput style={styles.input} placeholder="Please specify" value={otherManagement} onChangeText={setOtherManagement} />
      )}

      <Button title="Submit" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  label: { marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginBottom: 10 },
  radioOption: { flexDirection: 'row', alignItems: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 }
});
