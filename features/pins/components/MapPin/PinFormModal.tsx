import { ScrollView } from 'react-native';
import ModalWrapper from '~/shared/components/ui/ModalWrapper';
import { PinForm, PinFormValues } from './PinForm';
import { v4 as uuidv4 } from 'uuid';

type PinFormModalWrapperProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (formData: PinFormValues) => void;
  coords: { lat: number; lng: number };
};

export const PinFormModal = ({ visible, onClose, onSubmit, coords }: PinFormModalWrapperProps) => {
  const initialValues: PinFormValues = {
    name: '',
    cityVillage: '',
    address: '',
    description: '',
    type: 'normal',
    localImages: [],
    id: uuidv4(),
    lat: coords.lat,
    lng: coords.lng,
  };

  return (
    // PinFormModal.tsx (updated button layout and spacing)
    <ModalWrapper title="Create Pin" visible={visible} onClose={onClose}>
      <ScrollView>
        <PinForm onSubmit={onSubmit} initialValues={initialValues} />
      </ScrollView>
    </ModalWrapper>
  );
};
