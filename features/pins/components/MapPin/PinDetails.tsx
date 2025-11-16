import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Button } from '~/shared/components/ui/Button';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pin } from '~/db/types';
import PinDetailsDisplay from './PinDetailsDisplay';
import Spacer from '~/shared/components/ui/Spacer';
import { PinForm, PinFormValues } from './PinForm';
import { MaterialIcons } from '@expo/vector-icons';
import { parseJsonArray } from '~/shared/utils/parsing';
import { normalizeFileUri } from '~/services/images/imageStrategy';

type PinDetailsProps = {
  pin: Pin;
  onUpdate: (formData: PinFormValues) => void;
  onDelete: (pin: Pin) => void;
};

//helper
const intoPinFormValues = (pin: Pin): PinFormValues => {
  const parsedLocalImages = parseJsonArray(pin.localImages);
  const parsedRemoteImages = parseJsonArray(pin.images);

  console.log('🔍 PinDetails - Raw localImages from DB:', pin.localImages);
  console.log('🔍 PinDetails - Raw images (remote) from DB:', pin.images);
  console.log('🔍 PinDetails - Parsed localImages:', parsedLocalImages);
  console.log('🔍 PinDetails - Parsed remote images:', parsedRemoteImages);

  // Normalize local file URIs to ensure file:// scheme for display
  const normalizedLocalImages = parsedLocalImages.map(normalizeFileUri);

  // IMPORTANT: Only use localImages for the form
  // Remote images are for DISPLAY only (in PinDetailsDisplay)
  // The form works with local files - user can add/remove from there
  // If pin was synced from backend with no local files, form starts empty
  console.log('🔍 PinDetails - Form will use localImages only:', normalizedLocalImages);

  return {
    id: pin.id,
    name: pin.name,
    cityVillage: pin.cityVillage,
    address: pin.address,
    description: pin.description,
    type: pin.type,
    localImages: normalizedLocalImages, // ONLY local files
    lat: pin.lat,
    lng: pin.lng,
    version: pin.version, // Include version for conflict detection
  };
};

export default function PinDetails({ pin, onUpdate, onDelete }: PinDetailsProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const handleViewForms = () => {
    router.push({ pathname: '/form/[pinId]', params: { pinId: pin.id, pinName: pin.name } });
  };

  return (
    <View>
      {isEditing ? (
        <PinForm onSubmit={onUpdate} initialValues={intoPinFormValues(pin)} />
      ) : (
        <PinDetailsDisplay pin={pin} />
      )}
      <View style={styles.iconRow}>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.iconButton}>
          <MaterialIcons name={isEditing ? 'visibility' : 'edit'} size={30} color="blue" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDelete(pin)} style={styles.iconButton}>
          <MaterialIcons name="delete" size={30} color="red" />
        </TouchableOpacity>
      </View>

      <Spacer />
      <Button title="View Forms" onPress={handleViewForms} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16, // or use justifyContent: 'space-between' if stretched
  },

  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#e3f2fd', // Light blue background
  },
});
