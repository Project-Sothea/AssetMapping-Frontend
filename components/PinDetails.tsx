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

const intoPinFormValues = (pin: Pin): Partial<PinFormValues> => {
  return {
    name: pin.name ?? '',
    address: pin.address ?? undefined,
    stateProvince: pin.stateProvince ?? undefined,
    postalCode: pin.postalCode ?? undefined,
    country: pin.country ?? undefined,
    description: pin.description ?? undefined,
    type: pin.type ?? 'normal',
    images: pin.localImages
      ? JSON.parse(pin.localImages).map((uri: string) => ({ uri }))
      : undefined,
  };
};
