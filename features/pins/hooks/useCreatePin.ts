import { useMutation } from '@tanstack/react-query';
import { Pin } from '~/db/types';
import { createPin } from '../services';

export const useCreatePin = () => {
  const mutation = useMutation({
    mutationFn: (pin: Omit<Pin, 'id'>) => createPin(pin),
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
