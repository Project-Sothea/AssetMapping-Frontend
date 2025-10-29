import { View, Text, TextInput, StyleSheet } from 'react-native';
import RadioGroup from './RadioGroup';

export default function GeneralSection({
  values,
  setFieldValue,
  handleChange,
  handleBlur,
  errors,
  touched,
}: any) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Form name</Text>
        <TextInput
          style={styles.inputTitle}        
          onChangeText={handleChange('name')}
          onBlur={handleBlur('name')}
          value={values.name}
          placeholder="e.g. 2025 December"
        />
        {errors.name && touched.name && <Text style={styles.error}>{errors.name}</Text>}
        <Text style={styles.helperText}>This name uniquely identifies the form across exports and downloads.</Text>
    </View>

      <Text style={styles.heading}>General</Text>

      <Text style={styles.question}>Which village are you from?*</Text>
      <RadioGroup
        name="village"
        options={[
          { label: 'KS', value: 'KS' },
          { label: 'SO', value: 'SO' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
        errors={errors.village}
        touched={touched.village}
      />

      <Text style={styles.question}>What is your village identifier number?*</Text>
      <TextInput
        style={styles.input}
        onChangeText={handleChange('villageId')}
        onBlur={handleBlur('villageId')}
        value={values.villageId}
        placeholder="e.g. A1, B2"
      />
      {errors.villageId && touched.villageId && (
        <Text style={styles.error}>{errors.villageId}</Text>
      )}

      <Text style={styles.question}>
        Are you physically able to attend our health screening in December?
      </Text>
      <RadioGroup
        name="canAttend"
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: "Don't want to come", value: 'dontWant' },
        ]}
        values={values}
        setFieldValue={setFieldValue}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {                      
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    // subtle card shadow
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 6,
  },
  headerTitle: {                
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  inputTitle: {        
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 48,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {            
    fontSize: 12,
    color: '#6B7280',
  },
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 6,
    borderRadius: 4,
    minHeight: 40,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
