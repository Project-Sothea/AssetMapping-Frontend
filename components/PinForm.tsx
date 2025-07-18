import { Formik } from 'formik';
import * as Yup from 'yup';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';

const PinFormSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  address: Yup.string(),
  stateProvince: Yup.string(),
  postalCode: Yup.string(),
  country: Yup.string(),
  description: Yup.string(),
});

export type PinFormValues = {
  name: string;
  address?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  description?: string;
};

type PinFormProps = {
  onSubmit: (formData: PinFormValues) => void;
};

export const PinForm = ({ onSubmit }: PinFormProps) => {
  return (
    <Formik<PinFormValues>
      initialValues={{
        name: '',
        address: '',
        stateProvince: '',
        postalCode: '',
        country: '',
        description: '',
      }}
      validationSchema={PinFormSchema}
      onSubmit={onSubmit}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
        <View style={styles.container}>
          {[
            { name: 'name', label: 'Name', required: true },
            { name: 'address', label: 'Address' },
            { name: 'stateProvince', label: 'State/ Province' },
            { name: 'postalCode', label: 'Postal Code' },
            { name: 'country', label: 'Country' },
            { name: 'description', label: 'Description' },
          ].map(({ name, label, required }) => (
            <View key={name}>
              <Text>
                {label}
                {required ? ' *' : ''}
              </Text>
              <TextInput
                style={styles.input}
                onChangeText={handleChange(name)}
                onBlur={handleBlur(name)}
                value={(values as any)[name]}
                placeholder={`Enter ${label.toLowerCase()}`}
              />
              {touched[name as keyof PinFormValues] && errors[name as keyof PinFormValues] && (
                <Text style={styles.error}>{errors[name as keyof PinFormValues]}</Text>
              )}
            </View>
          ))}

          <Button title="Create Pin" onPress={() => handleSubmit()} />
        </View>
      )}
    </Formik>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    marginBottom: 8,
    padding: 8,
    borderRadius: 4,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
