import { useMutation } from '@tanstack/react-query';

import { deleteForm } from '../services/FormService';

export const useDeleteForm = () => {
  const mutation = useMutation({
    mutationFn: (id: string) => deleteForm(id),
  });

  return {
    deleteForm: mutation.mutate,
    deleteFormAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
