import { useMutation } from '@tanstack/react-query';
import { updatePin } from '../services/PinService';
import { PinFormValues } from '../types/PinFormValues';

export const useUpdatePin = () => {
  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PinFormValues> }) =>
      updatePin(id, updates),
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
