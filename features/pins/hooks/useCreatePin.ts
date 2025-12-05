import { useMutation } from '@tanstack/react-query';
import type { Pin } from '~/db/schema';
import { createPin } from '../services/PinService';

export const useCreatePin = () => {
  const mutation = useMutation({
    mutationFn: (pin: Pin) => createPin(pin),
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
