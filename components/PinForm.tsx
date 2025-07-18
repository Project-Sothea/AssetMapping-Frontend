import { Formik } from 'formik';
import * as ImagePicker from 'expo-image-picker';
import * as Yup from 'yup';
import { View, TextInput, Button, Text, StyleSheet, ScrollView, Image } from 'react-native';

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
  address: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  description: string | null;
  type: string;
  images: { uri: string }[]; // array of images with uri
};

type PinFormProps = {
  onSubmit: (formData: PinFormValues) => void;
};

export const PinForm = ({ onSubmit }: PinFormProps) => {
  const pickImage = async (setFieldValue: any, images: { uri: string }[]) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
      const uri = pickerResult.assets[0].uri;

      const newImage = { uri };
      setFieldValue('images', [...images, newImage]);
    } else {
      console.warn('No images selected or picker was canceled.');
    }
  };

  return (
    <Formik<PinFormValues>
      initialValues={{
        name: '',
        address: '',
        state_province: '',
        postal_code: '',
        country: '',
        description: '',
        type: 'normal',
        images: [],
      }}
      validationSchema={PinFormSchema}
      onSubmit={onSubmit}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
        <View style={styles.container}>
          {[
            { name: 'name', label: 'Name', required: true },
            { name: 'address', label: 'Address' },
            { name: 'state_province', label: 'State/ Province' },
            { name: 'postal_code', label: 'Postal Code' },
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
              {touched.images && errors.images && Array.isArray(errors.images) && (
                <Text style={styles.error}>
                  {(errors.images[0] as any)?.uri ?? 'Invalid image'}
                </Text>
              )}
            </View>
          ))}

          <View style={{ marginBottom: 20 }}>
            <Text style={{ marginBottom: 8 }}>Images</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}>
              {values.images.map((image, idx) => (
                <Image
                  key={idx}
                  source={{ uri: image.uri }}
                  style={{ width: 80, height: 80, marginRight: 8, borderRadius: 8 }}
                />
              ))}
            </ScrollView>

            <Button title="Pick an image" onPress={() => pickImage(setFieldValue, values.images)} />

            {/* Optionally display validation error */}
            {touched.images && errors.images && (
              <Text style={styles.error}>{errors.images as string}</Text>
            )}
          </View>

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
