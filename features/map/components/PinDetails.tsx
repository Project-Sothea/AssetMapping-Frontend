import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Button } from '~/shared/components/ui/Button';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { Pin } from '~/db/schema';
import PinDetailsDisplay from './PinDetailsDisplay';
import Spacer from '~/shared/components/ui/Spacer';
import { PinForm, PinFormValues } from './PinForm';
import { MaterialIcons } from '@expo/vector-icons';
import { parseJsonArray } from '~/shared/utils/parsing';

type PinDetailsProps = {
  pin: Pin;
  onUpdate: (formData: PinFormValues) => void;
  onDelete: (pin: Pin) => void;
};

//helper
const intoPinFormValues = (pin: Pin): PinFormValues => {
  // Get filenames from database
  const filenames = parseJsonArray(pin.images);

  return {
    id: pin.id,
    name: pin.name ?? '',
    cityVillage: pin.cityVillage ?? '',
    address: pin.address ?? '',
    description: pin.description ?? '',
    type: pin.type ?? '',
    images: filenames, // Just filenames, paths constructed when needed
    lat: pin.lat,
    lng: pin.lng,
    version: pin.version ?? null,
  };
};

export default function PinDetails({ pin, onUpdate, onDelete }: PinDetailsProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const handleViewForms = () => {
    router.push({ pathname: '/pin/[pinId]/forms', params: { pinId: pin.id, pinName: pin.name } });
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
