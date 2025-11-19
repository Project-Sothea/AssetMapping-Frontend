import { useMutation } from '@tanstack/react-query';
import { updateForm } from '../services/FormService';
import type { FormDB } from '~/db/schema';

export const useUpdateForm = () => {
  const mutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Omit<FormDB, 'id'> }) =>
      updateForm(id, values),
  });

  return {
    updateForm: mutation.mutate,
    updateFormAsync: mutation.mutateAsync,
    loading: mutation.isPending,
    error: mutation.error?.message || null,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
};
