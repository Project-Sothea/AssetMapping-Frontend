import { useMutation } from '@tanstack/react-query';
import { deletePin } from '../services/PinService';

export const useDeletePin = () => {
  const mutation = useMutation({
    mutationFn: (id: string) => deletePin(id),
  });

  return {
    deletePin: mutation.mutate,
    deletePinAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
