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
    <View>
      <Text style={styles.heading}>General</Text>

      <Text>Which village are you from?*</Text>
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

      <Text>What is your village identifier number?*</Text>
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

      <Text>Are you physically able to attend our health screening in December?</Text>
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
  heading: {
    fontWeight: 'bold',
    fontSize: 20,
    marginVertical: 12,
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
