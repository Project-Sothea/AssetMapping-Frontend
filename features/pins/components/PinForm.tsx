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
import { useEffect, useMemo, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  deleteImageByFilename,
  getLocalPath,
  pickImage,
  saveImageLocally,
} from '~/services/images/ImageManager';
import { MaterialIcons } from '@expo/vector-icons';
import { PinValues } from '../types/';
import { v4 as uuidv4 } from 'uuid';

const pinSchema = z.looseObject({
  name: z.string().trim().min(1, 'Name is required'),
});

type PinFormProps = {
  onSubmit: (formData: PinValues) => void;
  selectedPin: PinValues | null;
  coords?: { lat: number; lng: number };
};

export const PinForm = ({ onSubmit, selectedPin, coords }: PinFormProps) => {
  const isCreate = selectedPin === null;
  const idRef = useRef<string>(uuidv4());

  const defaults = useMemo((): PinValues => {
    if (!isCreate) return selectedPin!;
    if (!coords) throw new Error('coords is required in create mode');

    return {
      id: idRef.current,
      name: '',
      address: '',
      cityVillage: '',
      description: '',
      type: 'normal',
      images: [],
      lat: coords.lat,
      lng: coords.lng,
    } satisfies PinValues;
  }, [isCreate, selectedPin, coords]);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PinValues>({
    defaultValues: defaults,
    resolver: zodResolver(pinSchema) as unknown as Resolver<PinValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!isCreate && selectedPin) {
      reset(selectedPin);
    }
  }, [isCreate, selectedPin?.id, reset, selectedPin]);

  const values = watch();

  // Use the current id from form values for any image operations
  const currentId = values.id;

  const appendNewImage = async (currentFilenames: string[] | null) => {
    try {
      // Pick image
      const pickedUri = await pickImage();
      if (!pickedUri) return;

      // Save to pin folder (returns filename)
      const newFilename = await saveImageLocally(currentId, pickedUri);

      // Add filename to form
      const existing = Array.isArray(currentFilenames) ? currentFilenames : [];
      setValue('images', [...existing, newFilename], { shouldValidate: true, shouldDirty: true });
      console.log('📥 Added image:', newFilename);
    } catch (error) {
      console.error('Failed to add image:', error);
    }
  };

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
            onChangeText={(text) =>
              setValue(name as keyof PinValues, text as PinValues[keyof PinValues], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            value={(values[name as keyof PinValues] as string) ?? ''}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
          {errors[name as keyof typeof errors]?.message && (
            <Text style={styles.error}>{String(errors[name as keyof typeof errors]?.message)}</Text>
          )}
        </View>
      ))}

      <View>
        <Text style={{ marginBottom: 8 }}>Images</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {values.images &&
            values.images.length > 0 &&
            values.images.map((filename, idx) => {
              const localPath = getLocalPath(currentId, filename);
              return (
                <View
                  key={`image-${idx}-${filename}`}
                  style={{ position: 'relative', marginRight: 8 }}>
                  <Image
                    source={{ uri: localPath }}
                    style={{ width: 80, height: 80, marginRight: 8, borderRadius: 8 }}
                    onError={(e) =>
                      console.error(`❌ Image ${idx} failed to load:`, e.nativeEvent.error)
                    }
                    onLoad={() => console.log(`✅ Image ${idx} loaded`)}
                  />
                  <Pressable
                    onPress={() => {
                      const remainingFilenames = values.images?.filter((_, i) => i !== idx);
                      setValue('images', remainingFilenames, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      console.log('🗑️ Removed from form:', filename);

                      deleteImageByFilename(currentId, filename).catch((error) =>
                        console.warn('⚠️ Failed to delete local image', filename, error)
                      );
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
              );
            })}
        </ScrollView>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => appendNewImage(values.images)}
            style={styles.imagePickerButton}>
            <MaterialIcons name="image" size={24} color="blue" />
            <Text style={styles.imagePickerText}>Pick an Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit((data) => onSubmit(data))}
            style={styles.saveButton}>
            <MaterialIcons name="save" size={24} color="green" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        {errors.images?.message && <Text style={styles.error}>{errors.images.message}</Text>}
      </View>
    </View>
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
