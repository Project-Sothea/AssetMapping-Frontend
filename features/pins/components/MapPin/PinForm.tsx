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
import * as ImageManager from '~/services/sync/logic/images/ImageManager';
import { MaterialIcons } from '@expo/vector-icons';

const PinFormSchema = Yup.object().shape({
  name: Yup.string().nullable().required('Name is required'),
  cityVillage: Yup.string().nullable(),
  address: Yup.string().nullable(),
  description: Yup.string().nullable(),
  type: Yup.string().nullable(),
  id: Yup.string().required(),
  lat: Yup.number().nullable().required('Latitude is required'),
  lng: Yup.number().nullable().required('Longitude is required'),
  localImages: Yup.array().of(Yup.string()).nullable(),
});

export type PinFormValues = {
  name: string | null;
  cityVillage: string | null;
  address: string | null;
  description: string | null;
  type: string | null;
  localImages: string[]; // array of images with uri (may be null)
  id: string;
  lat: number | null;
  lng: number | null;
};

type PinFormProps = {
  onSubmit: (formData: PinFormValues) => void;
  initialValues: PinFormValues;
};

export const PinForm = ({ onSubmit, initialValues }: PinFormProps) => {
  const appendNewImage = async (setFieldValue: any, images: string[] | null) => {
    const { data, error } = await ImageManager.getPickedImage();
    const safeImages = Array.isArray(images) ? images : [];
    if (!error && data) {
      setFieldValue('localImages', [...safeImages, data]);
    } else if (error) {
      console.warn(error.message);
    }
    return;
  };

  return (
    <Formik<PinFormValues>
      initialValues={initialValues}
      validationSchema={PinFormSchema}
      onSubmit={onSubmit}
      validateOnChange={false}
      validateOnBlur={false}>
      {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => {
        return (
          <View style={styles.container}>
            {[
              { name: 'name', label: 'Name', required: true },
              { name: 'cityVillage', label: 'City/Village' },
              { name: 'address', label: 'Address' },
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
                  values.localImages.length > 0 &&
                  values.localImages.map((image, idx) => (
                    <View
                      key={`image-${idx}-${image.substring(0, 10)}`}
                      style={{ position: 'relative', marginRight: 8 }}>
                      <Image
                        source={{ uri: image }}
                        style={{ width: 80, height: 80, marginRight: 8, borderRadius: 8 }}
                      />
                      <Pressable
                        onPress={() => {
                          const newImages = values.localImages.filter((_, i) => i !== idx);
                          // Always set to array, even if empty
                          setFieldValue('localImages', newImages.length > 0 ? newImages : []);
                          console.log('Removed image, remaining:', newImages.length);
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

                <TouchableOpacity
                  onPress={() => {
                    handleSubmit();
                  }}
                  style={styles.saveButton}>
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
        );
      }}
    </Formik>
  );
};

// PinForm.tsx (update styles)
const styles = StyleSheet.create({
  container: { padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  error: {
    color: 'red',
    marginBottom: 8,
    fontSize: 12,
  },
  section: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#D0E8FF',
  },
  imagePickerText: { marginLeft: 8, fontWeight: 'bold', color: '#3498db' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#e0f7e9',
    borderRadius: 12,
  },
  saveButtonText: { marginLeft: 8, color: '#2ecc71', fontWeight: 'bold' },
  imageThumbnailContainer: {
    position: 'relative',
    marginRight: 10,
  },
  imageThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    zIndex: 1,
  },
});
