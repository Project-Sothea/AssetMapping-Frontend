import { useMutation } from '@tanstack/react-query';
import { Pin } from '~/db/types';
import { updatePin } from '../services';

export const useUpdatePin = () => {
  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pin> }) => updatePin(id, updates),
  });

  return {
    updatePin: mutation.mutate,
    updatePinAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
