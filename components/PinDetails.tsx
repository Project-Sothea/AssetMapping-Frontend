import { View } from 'react-native';
import { Button } from './Button';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pin } from '~/db/schema';
import PinDetailsDisplay from './PinDetailsDisplay';
import Spacer from './customUI/Spacer';
import { PinForm, PinFormValues } from './PinForm';

type PinDetailsProps = {
  pin: Pin;
  onUpdate: (formData: PinFormValues) => void;
};

export default function PinDetails({ pin, onUpdate }: PinDetailsProps) {
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);

  const handleViewForms = () => {
    router.push({ pathname: '/map/form/[pinId]', params: { pinId: pin.id, pinName: pin.name } });
  };

  return (
    <View>
      {isEditing ? (
        <PinForm onSubmit={onUpdate} initialValues={intoPinFormValues(pin)} />
      ) : (
        <PinDetailsDisplay pin={pin} />
      )}
      <Button
        title={isEditing ? 'View Pin' : 'Edit Pin'}
        onPress={() => setIsEditing(!isEditing)}
      />
      <Spacer />
      <Button title="View Forms" onPress={handleViewForms} />
    </View>
  );
}

const intoPinFormValues = (pin: Pin): PinFormValues => {
  return {
    id: pin.id,
    name: pin.name,
    address: pin.address,
    stateProvince: pin.stateProvince,
    postalCode: pin.postalCode,
    country: pin.country,
    description: pin.description,
    type: pin.type,
    localImages: pin.localImages
      ? JSON.parse(pin.localImages).map((uri: string) => ({ uri }))
      : null,
    lat: pin.lat,
    lng: pin.lng,
  };
};
