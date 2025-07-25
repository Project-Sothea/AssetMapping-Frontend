import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import * as ImageManager from '~/services/ImageManager';
import { MaterialIcons } from '@expo/vector-icons';

const PinFormSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  address: Yup.string(),
  stateProvince: Yup.string(),
  postalCode: Yup.string(),
  country: Yup.string(),
  description: Yup.string(),
});

const defaultValues: PinFormValues = {
  name: '',
  address: '',
  stateProvince: '',
  postalCode: '',
  country: '',
  description: '',
  type: 'normal',
  images: [],
};

export type PinFormValues = {
  name: string | null;
  address: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  description: string | null;
  type: string | null;
  images: { uri: string }[]; // array of images with uri
};

type PinFormProps = {
  onSubmit: (formData: PinFormValues) => void;
  initialValues?: Partial<PinFormValues>;
};

export const PinForm = ({ onSubmit, initialValues }: PinFormProps) => {
  const mergedInitialValues = {
    ...defaultValues,
    ...initialValues,
  };
  const appendNewImage = async (setFieldValue: any, images: { uri: string }[]) => {
    const { data, error } = await ImageManager.getPickedImage();
    if (!error) {
      setFieldValue('images', [...images, data]);
    } else {
      console.warn(error.message);
    }
    return;
  };

  return (
    <Formik<PinFormValues>
      initialValues={mergedInitialValues}
      validationSchema={PinFormSchema}
      onSubmit={onSubmit}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
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
              {values.images &&
                values.images.map((image, idx) => (
                  <View key={idx} style={{ position: 'relative', marginRight: 8 }}>
                    <Image
                      key={idx}
                      source={{ uri: image.uri }}
                      style={{ width: 80, height: 80, marginRight: 8, borderRadius: 8 }}
                    />
                    <Pressable
                      onPress={() => {
                        const newImages = values.images.filter((_, i) => i !== idx);
                        setFieldValue('images', newImages);
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 8,
                        backgroundColor: 'white',
                        borderRadius: 12,
                        padding: 2,
                        zIndex: 1,
                      }}>
                      <MaterialIcons name="cancel" size={20} color="red" />
                    </Pressable>
                  </View>
                ))}
            </ScrollView>

            <Button
              title="Pick an image"
              onPress={() => appendNewImage(setFieldValue, values.images)}
            />

            {/* Optionally display validation error */}
            {touched.images && errors.images && (
              <Text style={styles.error}>{errors.images as string}</Text>
            )}
          </View>

          <Button
            title={initialValues ? 'Update Pin' : 'Create Pin'}
            onPress={() => handleSubmit()}
          />
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

/*
  const appendNewImage = async (setFieldValue: any, images: { uri: string }[]) => {
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
      const localUriString = pickerResult.assets[0].uri;

      const newImage = { uri: localUriString };
      setFieldValue('images', [...images, newImage]);
    } else {
      console.warn('No images selected or picker was canceled.');
    }
  };
*/
