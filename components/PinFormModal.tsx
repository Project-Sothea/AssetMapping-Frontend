import ModalWrapper from './ModalWrapper';
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
    address: '',
    stateProvince: '',
    postalCode: '',
    country: '',
    description: '',
    type: 'normal',
    localImages: [],
    id: uuidv4(),
    lat: coords.lat,
    lng: coords.lng,
  };

  return (
    <ModalWrapper title={'Create Pin'} visible={visible} onClose={onClose}>
      <PinForm onSubmit={onSubmit} initialValues={initialValues} />
    </ModalWrapper>
  );
};
