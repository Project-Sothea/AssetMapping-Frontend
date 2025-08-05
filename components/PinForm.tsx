import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import * as ImageManager from '~/services/ImageManager';
import { MaterialIcons } from '@expo/vector-icons';

const PinFormSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  address: Yup.string(),
  stateProvince: Yup.string(),
  postalCode: Yup.string(),
  description: Yup.string(),
});

export type PinFormValues = {
  name: string | null;
  address: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  description: string | null;
  type: string | null;
  localImages: string[]; // array of images with uri
  id: string;
  lat: number | null;
  lng: number | null;
};

type PinFormProps = {
  onSubmit: (formData: PinFormValues) => void;
  initialValues: PinFormValues;
};

export const PinForm = ({ onSubmit, initialValues }: PinFormProps) => {
  const appendNewImage = async (setFieldValue: any, images: string[]) => {
    const { data, error } = await ImageManager.getPickedImage();
    if (!error) {
      setFieldValue('localImages', [...images, data]);
    } else {
      console.warn(error.message);
    }
    return;
  };

  return (
    <Formik<PinFormValues>
      initialValues={initialValues}
      validationSchema={PinFormSchema}
      onSubmit={onSubmit}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
        <View style={styles.container}>
          {[
            { name: 'name', label: 'Name', required: true },
            { name: 'address', label: 'Address' },
            { name: 'stateProvince', label: 'State/ Province' },
            { name: 'postalCode', label: 'Postal Code' },
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
              {touched.localImages && errors.localImages && Array.isArray(errors.localImages) && (
                <Text style={styles.error}>
                  {(errors.localImages[0] as any)?.uri ?? 'Invalid image'}
                </Text>
              )}
            </View>
          ))}

          <View>
            <Text style={{ marginBottom: 8 }}>Images</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}>
              {values.localImages &&
                values.localImages.map((image, idx) => (
                  <View key={idx} style={{ position: 'relative', marginRight: 8 }}>
                    <Image
                      key={idx}
                      source={{ uri: image }}
                      style={{ width: 80, height: 80, marginRight: 8, borderRadius: 8 }}
                    />
                    <Pressable
                      onPress={() => {
                        const newImages = values.localImages.filter((_, i) => i !== idx);
                        setFieldValue('localImages', newImages);
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
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => appendNewImage(setFieldValue, values.localImages)}
                style={styles.imagePickerButton}>
                <MaterialIcons name="image" size={24} color="blue" />
                <Text style={styles.imagePickerText}>Pick an Image</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleSubmit()} style={styles.saveButton}>
                <MaterialIcons name="save" size={24} color="green" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Optionally display validation error */}
            {touched.localImages && errors.localImages && (
              <Text style={styles.error}>{errors.localImages as string}</Text>
            )}
          </View>
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center', // vertically center buttons
    alignContent: 'space-between',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#D0E8FF',
  },
  imagePickerText: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
    color: 'blue',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#e0f7e9',
    borderRadius: 10,
  },
  saveButtonText: {
    marginLeft: 8,
    color: 'green',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
