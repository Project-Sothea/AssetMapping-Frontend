import { useMutation } from '@tanstack/react-query';
import { createPin } from '../services/PinService';
import { PinValues } from '../types/';

export const useCreatePin = () => {
  const mutation = useMutation({
    mutationFn: (pin: PinValues) => createPin(pin),
  });

  return {
    createPin: mutation.mutate,
    createPinAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
